import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { nextDocumentNumber } from '../utils/documentNumber';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { add, mul, roundMoney, sub, toDecimal, toNumber } from '../utils/money';
import { applyStockChange } from './stock.service';
import { purchaseReturnFinancials } from './purchase.service';
import type { CreatePurchaseReturnInput } from '../validators/purchaseReturn.validators';

function serialize(ret: {
  id: string;
  tenantId: string;
  purchaseId: string;
  supplierId: string | null;
  returnNumber: string;
  returnDate: Date;
  reason: string | null;
  subtotal: unknown;
  grandTotal: unknown;
  createdBy: string | null;
  createdAt: Date;
  items?: Array<{
    id: string;
    productId: string;
    quantity: unknown;
    unitPrice: unknown;
    lineTotal: unknown;
    product?: { id: string; name: string; size?: string | null };
  }>;
  purchase?: { id: string; invoiceNumber: string };
  supplier?: { id: string; name: string } | null;
}) {
  return {
    ...ret,
    subtotal: toNumber(ret.subtotal as string),
    grandTotal: toNumber(ret.grandTotal as string),
    items: ret.items?.map((i) => ({
      ...i,
      quantity: toNumber(i.quantity as string),
      unitPrice: toNumber(i.unitPrice as string),
      lineTotal: toNumber(i.lineTotal as string),
    })),
  };
}

export async function createPurchaseReturn(
  tenantId: string,
  userId: string,
  input: CreatePurchaseReturnInput
) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({
      where: { id: input.purchaseId, tenantId },
      include: { items: true },
    });
    if (!purchase) throw new NotFoundError('Purchase not found');
    if (purchase.status === 'DRAFT' || purchase.status === 'CANCELLED') {
      throw new BadRequestError('Cannot return a draft or cancelled purchase');
    }

    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    let subtotal = toDecimal(0);
    const lineItems: Array<{
      productId: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }> = [];

    for (const item of input.items) {
      const purchaseItem = purchase.items.find((pi) => pi.productId === item.productId);
      if (!purchaseItem) {
        throw new BadRequestError(`Product ${item.productId} was not on this purchase`);
      }
      const alreadyReturned = toDecimal(purchaseItem.returnedQty);
      const available = sub(purchaseItem.quantity, alreadyReturned);
      if (toDecimal(item.quantity).greaterThan(available)) {
        throw new BadRequestError(
          `Return qty exceeds available for product. Available: ${toNumber(available)}`
        );
      }

      const unitPrice = toDecimal(item.unitPrice ?? purchaseItem.unitPrice);
      const lineTotal = roundMoney(mul(item.quantity, unitPrice));
      subtotal = add(subtotal, lineTotal);
      lineItems.push({
        productId: item.productId,
        quantity: toDecimal(item.quantity),
        unitPrice,
        lineTotal,
      });

      await tx.purchaseItem.update({
        where: { id: purchaseItem.id },
        data: { returnedQty: add(alreadyReturned, item.quantity) },
      });
    }

    const returnNumber = await nextDocumentNumber(tx, tenantId, 'PURCHASE_RETURN', 'PRT');
    const purchaseReturn = await tx.purchaseReturn.create({
      data: {
        tenantId,
        purchaseId: purchase.id,
        supplierId: purchase.supplierId,
        returnNumber,
        returnDate: input.returnDate ?? new Date(),
        reason: input.reason,
        subtotal,
        grandTotal: subtotal,
        createdBy: userId,
        items: { create: lineItems },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, size: true } } } },
        purchase: { select: { id: true, invoiceNumber: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    for (const item of lineItems) {
      await applyStockChange(tx, {
        tenantId,
        productId: item.productId,
        quantityDelta: toDecimal(item.quantity).negated(),
        type: 'PURCHASE_RETURN',
        unitCost: item.unitPrice,
        referenceType: 'PURCHASE_RETURN',
        referenceId: purchaseReturn.id,
        createdBy: userId,
        allowNegative: tenant.allowNegativeStock,
      });
    }

    if (purchase.supplierId) {
      const supplier = await tx.supplier.findFirstOrThrow({
        where: { id: purchase.supplierId, tenantId },
      });
      const newBalance = sub(supplier.currentBalance, subtotal);
      await tx.supplier.update({
        where: { id: supplier.id },
        data: { currentBalance: newBalance },
      });
      await tx.accountTransaction.create({
        data: {
          tenantId,
          partyType: 'SUPPLIER',
          partyId: supplier.id,
          type: 'PURCHASE_RETURN',
          amount: subtotal,
          balanceAfter: newBalance,
          referenceType: 'PURCHASE_RETURN',
          referenceId: purchaseReturn.id,
          createdBy: userId,
        },
      });
    }

    // Update purchase return status + dues after returns
    const refreshedItems = await tx.purchaseItem.findMany({ where: { purchaseId: purchase.id } });
    const allReturned = refreshedItems.every((pi) =>
      toDecimal(pi.returnedQty).greaterThanOrEqualTo(pi.quantity)
    );
    const anyReturned = refreshedItems.some((pi) => toDecimal(pi.returnedQty).greaterThan(0));
    const financials = purchaseReturnFinancials({
      grandTotal: purchase.grandTotal,
      paidAmount: purchase.paidAmount,
      items: refreshedItems,
    });
    await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        status: allReturned ? 'RETURNED' : anyReturned ? 'PARTIALLY_RETURNED' : purchase.status,
        remainingAmount: financials.remainingAmount,
        paymentStatus: financials.paymentStatus,
      },
    });

    return serialize(purchaseReturn);
  });
}

export async function listPurchaseReturns(
  tenantId: string,
  query: { page?: number; limit?: number; purchaseId?: string; from?: Date; to?: Date }
) {
  const { page, limit, skip, take } = parsePagination(query);
  const where: Prisma.PurchaseReturnWhereInput = {
    tenantId,
    ...(query.purchaseId ? { purchaseId: query.purchaseId } : {}),
    ...(query.from || query.to
      ? {
          returnDate: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.purchaseReturn.count({ where }),
    prisma.purchaseReturn.findMany({
      where,
      include: {
        items: { include: { product: { select: { id: true, name: true, size: true } } } },
        purchase: { select: { id: true, invoiceNumber: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { returnDate: 'desc' },
      skip,
      take,
    }),
  ]);

  return { items: items.map(serialize), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getPurchaseReturn(tenantId: string, id: string) {
  const ret = await prisma.purchaseReturn.findFirst({
    where: { id, tenantId },
    include: {
      items: { include: { product: { select: { id: true, name: true, size: true } } } },
      purchase: { select: { id: true, invoiceNumber: true } },
      supplier: { select: { id: true, name: true } },
    },
  });
  if (!ret) throw new NotFoundError('Purchase return not found');
  return serialize(ret);
}
