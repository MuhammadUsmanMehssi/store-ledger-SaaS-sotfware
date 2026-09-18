import { PaymentStatus, Prisma, PurchaseStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { nextDocumentNumber } from '../utils/documentNumber';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { add, maxMoney, minMoney, mul, roundMoney, sub, toDecimal, toNumber } from '../utils/money';
import { applyStockChange } from './stock.service';
import { recordCashTxn } from './cashSession.helper';
import type {
  CompletePurchaseInput,
  CreatePurchaseInput,
  RecordPurchasePaymentInput,
  UpdatePurchaseInput,
} from '../validators/purchase.validators';

function paymentStatus(grandTotal: Prisma.Decimal | number, paid: Prisma.Decimal | number): PaymentStatus {
  const g = toDecimal(grandTotal);
  const p = toDecimal(paid);
  if (g.lessThanOrEqualTo(0)) return 'PAID';
  if (p.lessThanOrEqualTo(0)) return 'UNPAID';
  if (p.greaterThanOrEqualTo(g)) return 'PAID';
  return 'PARTIAL';
}

export function purchaseReturnFinancials(purchase: {
  grandTotal: unknown;
  paidAmount: unknown;
  items?: Array<{ quantity: unknown; unitPrice: unknown; returnedQty: unknown; lineTotal: unknown }>;
}) {
  let returnedAmount = toDecimal(0);
  const itemNets =
    purchase.items?.map((item) => {
      const qty = toDecimal(item.quantity);
      const returnedQty = toDecimal(item.returnedQty ?? 0);
      const unitPrice = toDecimal(item.unitPrice);
      const lineReturned = roundMoney(mul(returnedQty, unitPrice));
      returnedAmount = add(returnedAmount, lineReturned);
      const netQty = maxMoney(sub(qty, returnedQty), 0);
      const netLineTotal = roundMoney(mul(netQty, unitPrice));
      return { netQty: toNumber(netQty), netLineTotal: toNumber(netLineTotal), lineReturned: toNumber(lineReturned) };
    }) ?? [];

  const invoiceTotal = toDecimal(purchase.grandTotal);
  const netTotal = maxMoney(sub(invoiceTotal, returnedAmount), 0);
  const paid = toDecimal(purchase.paidAmount);
  const appliedPaid = minMoney(paid, netTotal);
  const remainingAmount = maxMoney(sub(netTotal, paid), 0);
  const recoverable = maxMoney(sub(paid, netTotal), 0);

  return {
    returnedAmount: toNumber(returnedAmount),
    netTotal: toNumber(netTotal),
    remainingAmount: toNumber(remainingAmount),
    recoverable: toNumber(recoverable),
    paymentStatus: paymentStatus(netTotal, appliedPaid),
    itemNets,
  };
}

function serializePurchase(purchase: {
  id: string;
  tenantId: string;
  supplierId: string | null;
  invoiceNumber: string;
  purchaseDate: Date;
  status: PurchaseStatus;
  subtotal: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  grandTotal: unknown;
  paidAmount: unknown;
  remainingAmount: unknown;
  paymentMethod: string | null;
  paymentStatus: PaymentStatus;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplier?: { id: string; name: string } | null;
  items?: Array<{
    id: string;
    productId: string;
    quantity: unknown;
    unitPrice: unknown;
    discount: unknown;
    taxAmount: unknown;
    lineTotal: unknown;
    returnedQty: unknown;
    product?: { id: string; name: string; size?: string | null };
  }>;
}) {
  const financials = purchaseReturnFinancials(purchase);
  return {
    ...purchase,
    subtotal: toNumber(purchase.subtotal as string),
    discountAmount: toNumber(purchase.discountAmount as string),
    taxAmount: toNumber(purchase.taxAmount as string),
    grandTotal: toNumber(purchase.grandTotal as string),
    paidAmount: toNumber(purchase.paidAmount as string),
    remainingAmount: financials.remainingAmount,
    returnedAmount: financials.returnedAmount,
    netTotal: financials.netTotal,
    recoverable: financials.recoverable,
    paymentStatus: financials.paymentStatus,
    items: purchase.items?.map((i, idx) => ({
      ...i,
      quantity: toNumber(i.quantity as string),
      unitPrice: toNumber(i.unitPrice as string),
      discount: toNumber(i.discount as string),
      taxAmount: toNumber(i.taxAmount as string),
      lineTotal: toNumber(i.lineTotal as string),
      returnedQty: toNumber(i.returnedQty as string),
      netQty: financials.itemNets[idx]?.netQty ?? toNumber(i.quantity as string),
      netLineTotal:
        financials.itemNets[idx]?.netLineTotal ?? toNumber(i.lineTotal as string),
    })),
  };
}

async function completePurchaseInTx(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
  purchaseId: string,
  paidOverride?: number,
  paymentMethodOverride?: CreatePurchaseInput['paymentMethod']
) {
  const purchase = await tx.purchase.findFirst({
    where: { id: purchaseId, tenantId },
    include: { items: true },
  });
  if (!purchase) throw new NotFoundError('Purchase not found');
  if (purchase.status !== 'DRAFT') {
    throw new BadRequestError('Only draft purchases can be completed');
  }

  const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const paidAmount = paidOverride !== undefined ? toDecimal(paidOverride) : toDecimal(purchase.paidAmount);
  const paymentMethod = paymentMethodOverride ?? purchase.paymentMethod ?? 'CREDIT';
  const remaining = sub(purchase.grandTotal, paidAmount);

  for (const item of purchase.items) {
    await applyStockChange(tx, {
      tenantId,
      productId: item.productId,
      quantityDelta: item.quantity,
      type: 'PURCHASE',
      unitCost: item.unitPrice,
      referenceType: 'PURCHASE',
      referenceId: purchase.id,
      createdBy: userId,
      allowNegative: tenant.allowNegativeStock,
    });
  }

  if (purchase.supplierId) {
    const supplier = await tx.supplier.findFirstOrThrow({
      where: { id: purchase.supplierId, tenantId },
    });
    const afterPurchase = add(supplier.currentBalance, purchase.grandTotal);
    await tx.accountTransaction.create({
      data: {
        tenantId,
        partyType: 'SUPPLIER',
        partyId: supplier.id,
        type: 'PURCHASE',
        amount: purchase.grandTotal,
        balanceAfter: afterPurchase,
        paymentMethod,
        referenceType: 'PURCHASE',
        referenceId: purchase.id,
        createdBy: userId,
      },
    });

    let finalBalance = afterPurchase;
    if (paidAmount.greaterThan(0)) {
      finalBalance = sub(afterPurchase, paidAmount);
      await tx.accountTransaction.create({
        data: {
          tenantId,
          partyType: 'SUPPLIER',
          partyId: supplier.id,
          type: 'PAYMENT',
          amount: paidAmount,
          balanceAfter: finalBalance,
          paymentMethod,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          createdBy: userId,
        },
      });
    }

    await tx.supplier.update({
      where: { id: supplier.id },
      data: { currentBalance: finalBalance },
    });
  }

  if (paidAmount.greaterThan(0) && paymentMethod === 'CASH') {
    await recordCashTxn(tx, {
      tenantId,
      type: 'SUPPLIER_PAYMENT',
      amount: paidAmount,
      direction: 'OUT',
      referenceType: 'PURCHASE',
      referenceId: purchase.id,
      createdBy: userId,
    });
  }

  return tx.purchase.update({
    where: { id: purchase.id },
    data: {
      status: 'COMPLETED',
      paidAmount,
      remainingAmount: remaining.lessThan(0) ? 0 : remaining,
      paymentMethod,
      paymentStatus: paymentStatus(purchase.grandTotal, paidAmount),
      updatedBy: userId,
    },
    include: {
      supplier: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, size: true } } } },
    },
  });
}

export async function createPurchase(tenantId: string, userId: string, input: CreatePurchaseInput) {
  if (input.supplierId) {
    const supplier = await prisma.supplier.findFirst({ where: { id: input.supplierId, tenantId } });
    if (!supplier) throw new BadRequestError('Supplier not found');
  }

  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { tenantId, id: { in: productIds }, deletedAt: null },
  });
  if (products.length !== new Set(productIds).size) {
    throw new BadRequestError('One or more products are invalid');
  }

  let subtotal = toDecimal(0);
  const lineItems = input.items.map((item) => {
    const discount = toDecimal(item.discount ?? 0);
    const tax = toDecimal(item.taxAmount ?? 0);
    const lineTotal = roundMoney(add(sub(mul(item.quantity, item.unitPrice), discount), tax));
    subtotal = add(subtotal, lineTotal);
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount,
      taxAmount: tax,
      lineTotal,
    };
  });

  const discountAmount = toDecimal(input.discountAmount ?? 0);
  const taxAmount = toDecimal(input.taxAmount ?? 0);
  const grandTotal = roundMoney(add(sub(subtotal, discountAmount), taxAmount));
  const paidAmount = toDecimal(input.paidAmount ?? 0);
  if (paidAmount.greaterThan(grandTotal)) {
    throw new BadRequestError('Paid amount cannot exceed grand total');
  }

  const purchase = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await nextDocumentNumber(tx, tenantId, 'PURCHASE', 'PUR');
    const created = await tx.purchase.create({
      data: {
        tenantId,
        supplierId: input.supplierId ?? null,
        invoiceNumber,
        purchaseDate: input.purchaseDate ?? new Date(),
        status: 'DRAFT',
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal,
        paidAmount,
        remainingAmount: sub(grandTotal, paidAmount),
        paymentMethod: input.paymentMethod,
        paymentStatus: paymentStatus(grandTotal, paidAmount),
        notes: input.notes,
        createdBy: userId,
        updatedBy: userId,
        items: { create: lineItems },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, size: true } } } },
      },
    });

    if (input.status === 'COMPLETED') {
      return completePurchaseInTx(
        tx,
        tenantId,
        userId,
        created.id,
        toNumber(paidAmount),
        input.paymentMethod
      );
    }

    return created;
  });

  return serializePurchase(purchase);
}

export async function updateDraftPurchase(
  tenantId: string,
  userId: string,
  id: string,
  input: UpdatePurchaseInput
) {
  const existing = await prisma.purchase.findFirst({
    where: { id, tenantId },
    include: { items: true },
  });
  if (!existing) throw new NotFoundError('Purchase not found');
  if (existing.status !== 'DRAFT') {
    throw new BadRequestError('Only draft purchases can be edited');
  }

  if (input.supplierId) {
    const supplier = await prisma.supplier.findFirst({ where: { id: input.supplierId, tenantId } });
    if (!supplier) throw new BadRequestError('Supplier not found');
  }

  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { tenantId, id: { in: productIds }, deletedAt: null },
  });
  if (products.length !== new Set(productIds).size) {
    throw new BadRequestError('One or more products are invalid');
  }

  let subtotal = toDecimal(0);
  const lineItems = input.items.map((item) => {
    const discount = toDecimal(item.discount ?? 0);
    const tax = toDecimal(item.taxAmount ?? 0);
    const lineTotal = roundMoney(add(sub(mul(item.quantity, item.unitPrice), discount), tax));
    subtotal = add(subtotal, lineTotal);
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount,
      taxAmount: tax,
      lineTotal,
    };
  });

  const discountAmount = toDecimal(input.discountAmount ?? 0);
  const taxAmount = toDecimal(input.taxAmount ?? 0);
  const grandTotal = roundMoney(add(sub(subtotal, discountAmount), taxAmount));
  const paidAmount = toDecimal(input.paidAmount ?? 0);
  if (paidAmount.greaterThan(grandTotal)) {
    throw new BadRequestError('Paid amount cannot exceed grand total');
  }

  const purchase = await prisma.$transaction(async (tx) => {
    await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
    return tx.purchase.update({
      where: { id },
      data: {
        supplierId: input.supplierId === undefined ? undefined : input.supplierId,
        purchaseDate: input.purchaseDate,
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal,
        paidAmount,
        remainingAmount: sub(grandTotal, paidAmount),
        paymentMethod: input.paymentMethod,
        paymentStatus: paymentStatus(grandTotal, paidAmount),
        notes: input.notes === undefined ? undefined : input.notes,
        updatedBy: userId,
        items: { create: lineItems },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, size: true } } } },
      },
    });
  });

  return serializePurchase(purchase);
}

export async function completePurchase(
  tenantId: string,
  userId: string,
  id: string,
  input: CompletePurchaseInput
) {
  const purchase = await prisma.$transaction(async (tx) =>
    completePurchaseInTx(tx, tenantId, userId, id, input.paidAmount, input.paymentMethod)
  );
  return serializePurchase(purchase);
}

export async function recordPurchasePayment(
  tenantId: string,
  userId: string,
  id: string,
  input: RecordPurchasePaymentInput
) {
  const purchase = await prisma.$transaction(async (tx) => {
    const existing = await tx.purchase.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    if (!existing) throw new NotFoundError('Purchase not found');
    if (existing.status === 'DRAFT' || existing.status === 'CANCELLED') {
      throw new BadRequestError('Only received purchases can receive payments');
    }

    const financials = purchaseReturnFinancials(existing);
    const remaining = toDecimal(financials.remainingAmount);
    if (remaining.lessThanOrEqualTo(0)) {
      throw new BadRequestError('Purchase has no remaining due (check returns / recoverable)');
    }

    const amount = toDecimal(input.amount);
    if (amount.greaterThan(remaining)) {
      throw new BadRequestError(`Payment cannot exceed remaining amount of ${toNumber(remaining)}`);
    }

    const newPaid = add(existing.paidAmount, amount);
    const nextFinancials = purchaseReturnFinancials({
      ...existing,
      paidAmount: newPaid,
    });

    if (existing.supplierId) {
      const supplier = await tx.supplier.findFirstOrThrow({
        where: { id: existing.supplierId, tenantId },
      });
      if (toDecimal(supplier.currentBalance).lessThan(amount)) {
        throw new BadRequestError('Payment exceeds supplier outstanding balance');
      }
      const newBalance = sub(supplier.currentBalance, amount);
      await tx.supplier.update({
        where: { id: supplier.id },
        data: { currentBalance: newBalance, updatedBy: userId },
      });
      await tx.accountTransaction.create({
        data: {
          tenantId,
          partyType: 'SUPPLIER',
          partyId: supplier.id,
          type: 'PAYMENT',
          amount,
          balanceAfter: newBalance,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          referenceType: 'PURCHASE',
          referenceId: existing.id,
          createdBy: userId,
        },
      });
    }

    if (input.paymentMethod === 'CASH') {
      await recordCashTxn(tx, {
        tenantId,
        type: 'SUPPLIER_PAYMENT',
        amount,
        direction: 'OUT',
        referenceType: 'PURCHASE',
        referenceId: existing.id,
        notes: input.notes,
        createdBy: userId,
      });
    }

    return tx.purchase.update({
      where: { id: existing.id },
      data: {
        paidAmount: newPaid,
        remainingAmount: nextFinancials.remainingAmount,
        paymentMethod: input.paymentMethod,
        paymentStatus: nextFinancials.paymentStatus,
        updatedBy: userId,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, size: true } } } },
      },
    });
  });

  return serializePurchase(purchase);
}

export async function listPurchases(
  tenantId: string,
  query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: PurchaseStatus;
    supplierId?: string;
    from?: Date;
    to?: Date;
  }
) {
  const { page, limit, search, skip, take } = parsePagination(query);
  const where: Prisma.PurchaseWhereInput = {
    tenantId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(search ? { invoiceNumber: { contains: search, mode: 'insensitive' } } : {}),
    ...(query.from || query.to
      ? {
          purchaseDate: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, size: true } } } },
      },
      orderBy: { purchaseDate: 'desc' },
      skip,
      take,
    }),
  ]);

  return {
    items: items.map(serializePurchase),
    pagination: buildPaginationMeta(page, limit, total),
  };
}

export async function getPurchase(tenantId: string, id: string) {
  const purchase = await prisma.purchase.findFirst({
    where: { id, tenantId },
    include: {
      supplier: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, size: true } } } },
    },
  });
  if (!purchase) throw new NotFoundError('Purchase not found');
  return serializePurchase(purchase);
}
