import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { nextDocumentNumber } from '../utils/documentNumber';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { add, mul, roundMoney, sub, toDecimal, toNumber } from '../utils/money';
import { applyStockChange } from './stock.service';
import { recordCashTxn } from './cashSession.helper';
import { saleReturnFinancials } from './sale.service';
import type { CreateSaleReturnInput } from '../validators/saleReturn.validators';

function serialize(ret: {
  id: string;
  tenantId: string;
  saleId: string;
  customerId: string | null;
  returnNumber: string;
  returnDate: Date;
  reason: string | null;
  subtotal: unknown;
  grandTotal: unknown;
  refundMethod: string;
  createdBy: string | null;
  createdAt: Date;
  items?: Array<{
    id: string;
    productId: string;
    quantity: unknown;
    unitPrice: unknown;
    unitCost: unknown;
    lineTotal: unknown;
    product?: { id: string; name: string; size?: string | null };
  }>;
  sale?: { id: string; invoiceNumber: string };
  customer?: { id: string; name: string } | null;
}) {
  return {
    ...ret,
    subtotal: toNumber(ret.subtotal as string),
    grandTotal: toNumber(ret.grandTotal as string),
    items: ret.items?.map((i) => ({
      ...i,
      quantity: toNumber(i.quantity as string),
      unitPrice: toNumber(i.unitPrice as string),
      unitCost: toNumber(i.unitCost as string),
      lineTotal: toNumber(i.lineTotal as string),
    })),
  };
}

export async function createSaleReturn(tenantId: string, userId: string, input: CreateSaleReturnInput) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: input.saleId, tenantId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundError('Sale not found');
    if (sale.status === 'CANCELLED' || sale.status === 'HELD') {
      throw new BadRequestError('Cannot return this sale');
    }

    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    let subtotal = toDecimal(0);
    const lineItems: Array<{
      productId: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }> = [];

    for (const item of input.items) {
      const saleItem = sale.items.find((si) => si.productId === item.productId);
      if (!saleItem) throw new BadRequestError(`Product ${item.productId} was not on this sale`);

      const available = sub(saleItem.quantity, saleItem.returnedQty);
      if (toDecimal(item.quantity).greaterThan(available)) {
        throw new BadRequestError(`Return qty exceeds available (${toNumber(available)})`);
      }

      const qty = toDecimal(item.quantity);
      const unitPrice = toDecimal(saleItem.unitPrice);
      const unitCost = toDecimal(saleItem.unitCost);
      const lineTotal = roundMoney(mul(qty, unitPrice));
      subtotal = add(subtotal, lineTotal);

      lineItems.push({ productId: item.productId, quantity: qty, unitPrice, unitCost, lineTotal });

      await tx.saleItem.update({
        where: { id: saleItem.id },
        data: { returnedQty: add(saleItem.returnedQty, qty) },
      });
    }

    const returnNumber = await nextDocumentNumber(tx, tenantId, 'SALE_RETURN', 'SRT');
    const saleReturn = await tx.saleReturn.create({
      data: {
        tenantId,
        saleId: sale.id,
        customerId: sale.customerId,
        returnNumber,
        returnDate: input.returnDate ?? new Date(),
        reason: input.reason,
        subtotal,
        grandTotal: subtotal,
        refundMethod: input.refundMethod,
        createdBy: userId,
        items: { create: lineItems },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, size: true } } } },
        sale: { select: { id: true, invoiceNumber: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    for (const item of lineItems) {
      await applyStockChange(tx, {
        tenantId,
        productId: item.productId,
        quantityDelta: item.quantity,
        type: 'SALE_RETURN',
        unitCost: item.unitCost,
        referenceType: 'SALE_RETURN',
        referenceId: saleReturn.id,
        createdBy: userId,
        allowNegative: tenant.allowNegativeStock,
      });
    }

    if (sale.customerId) {
      const customer = await tx.customer.findFirstOrThrow({
        where: { id: sale.customerId, tenantId },
      });
      const newBalance = sub(customer.currentBalance, subtotal);
      await tx.customer.update({
        where: { id: customer.id },
        data: { currentBalance: newBalance },
      });
      await tx.accountTransaction.create({
        data: {
          tenantId,
          partyType: 'CUSTOMER',
          partyId: customer.id,
          type: 'SALE_RETURN',
          amount: subtotal,
          balanceAfter: newBalance,
          paymentMethod: input.refundMethod,
          referenceType: 'SALE_RETURN',
          referenceId: saleReturn.id,
          createdBy: userId,
        },
      });
    }

    if (input.refundMethod === 'CASH') {
      await recordCashTxn(tx, {
        tenantId,
        type: 'REFUND',
        amount: subtotal,
        direction: 'OUT',
        referenceType: 'SALE_RETURN',
        referenceId: saleReturn.id,
        createdBy: userId,
      });
    }

    const refreshed = await tx.saleItem.findMany({ where: { saleId: sale.id } });
    const allReturned = refreshed.every((si) =>
      toDecimal(si.returnedQty).greaterThanOrEqualTo(si.quantity)
    );
    const anyReturned = refreshed.some((si) => toDecimal(si.returnedQty).greaterThan(0));
    const financials = saleReturnFinancials({
      grandTotal: sale.grandTotal,
      paidAmount: sale.paidAmount,
      items: refreshed,
    });

    await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: allReturned ? 'RETURNED' : anyReturned ? 'PARTIALLY_RETURNED' : sale.status,
        remainingAmount: financials.remainingAmount,
        paymentStatus: financials.paymentStatus,
      },
    });

    return serialize(saleReturn);
  });
}

export async function listSaleReturns(
  tenantId: string,
  query: { page?: number; limit?: number; saleId?: string; from?: Date; to?: Date }
) {
  const { page, limit, skip, take } = parsePagination(query);
  const where: Prisma.SaleReturnWhereInput = {
    tenantId,
    ...(query.saleId ? { saleId: query.saleId } : {}),
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
    prisma.saleReturn.count({ where }),
    prisma.saleReturn.findMany({
      where,
      include: {
        items: { include: { product: { select: { id: true, name: true, size: true } } } },
        sale: { select: { id: true, invoiceNumber: true } },
        customer: { select: { id: true, name: true } },
      },
      orderBy: { returnDate: 'desc' },
      skip,
      take,
    }),
  ]);

  return { items: items.map(serialize), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getSaleReturn(tenantId: string, id: string) {
  const ret = await prisma.saleReturn.findFirst({
    where: { id, tenantId },
    include: {
      items: { include: { product: { select: { id: true, name: true, size: true } } } },
      sale: { select: { id: true, invoiceNumber: true } },
      customer: { select: { id: true, name: true } },
    },
  });
  if (!ret) throw new NotFoundError('Sale return not found');
  return serialize(ret);
}
