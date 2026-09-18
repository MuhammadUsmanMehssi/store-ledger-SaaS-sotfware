import { prisma } from '../config/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { add, sub, toDecimal, toNumber } from '../utils/money';
import { recordCashTxn } from './cashSession.helper';
import type {
  SupplierCreateInput,
  SupplierPaymentInput,
  SupplierUpdateInput,
} from '../validators/supplier.validators';

function serializeSupplier(s: {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  openingBalance: unknown;
  currentBalance: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...s,
    openingBalance: toNumber(s.openingBalance as string),
    currentBalance: toNumber(s.currentBalance as string),
  };
}

export async function listSuppliers(
  tenantId: string,
  query: { page?: number; limit?: number; search?: string; isActive?: boolean }
) {
  const { page, limit, search, skip, take } = parsePagination(query);
  const where = {
    tenantId,
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
  ]);

  return { items: items.map(serializeSupplier), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getSupplier(tenantId: string, id: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id, tenantId } });
  if (!supplier) throw new NotFoundError('Supplier not found');
  return serializeSupplier(supplier);
}

export async function createSupplier(tenantId: string, userId: string, input: SupplierCreateInput) {
  const opening = input.openingBalance ?? 0;

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({
      data: {
        tenantId,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        openingBalance: opening,
        currentBalance: opening,
        isActive: input.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    if (opening !== 0) {
      await tx.accountTransaction.create({
        data: {
          tenantId,
          partyType: 'SUPPLIER',
          partyId: supplier.id,
          type: 'OPENING',
          amount: opening,
          balanceAfter: opening,
          notes: 'Opening balance',
          createdBy: userId,
        },
      });
    }

    return serializeSupplier(supplier);
  });
}

export async function updateSupplier(
  tenantId: string,
  userId: string,
  id: string,
  input: SupplierUpdateInput
) {
  await getSupplier(tenantId, id);
  const { openingBalance: _o, ...rest } = input;
  const supplier = await prisma.supplier.update({
    where: { id },
    data: { ...rest, updatedBy: userId },
  });
  return serializeSupplier(supplier);
}

export async function deleteSupplier(tenantId: string, id: string) {
  await getSupplier(tenantId, id);
  const supplier = await prisma.supplier.update({
    where: { id },
    data: { isActive: false },
  });
  return serializeSupplier(supplier);
}

export async function recordSupplierPayment(
  tenantId: string,
  userId: string,
  id: string,
  input: SupplierPaymentInput
) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({ where: { id, tenantId } });
    if (!supplier) throw new NotFoundError('Supplier not found');

    const current = toNumber(supplier.currentBalance);
    if (input.amount > current + 0.0001) {
      throw new BadRequestError(`Payment exceeds supplier balance of ${current}`);
    }

    const newBalance = sub(supplier.currentBalance, input.amount);

    await tx.supplier.update({
      where: { id },
      data: { currentBalance: newBalance, updatedBy: userId },
    });

    const txn = await tx.accountTransaction.create({
      data: {
        tenantId,
        partyType: 'SUPPLIER',
        partyId: id,
        type: 'PAYMENT',
        amount: input.amount,
        balanceAfter: newBalance,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        createdBy: userId,
        referenceType: 'SUPPLIER_PAYMENT',
      },
    });

    if (input.paymentMethod === 'CASH') {
      await recordCashTxn(tx, {
        tenantId,
        type: 'SUPPLIER_PAYMENT',
        amount: input.amount,
        direction: 'OUT',
        referenceType: 'SUPPLIER_PAYMENT',
        referenceId: txn.id,
        notes: input.notes,
        createdBy: userId,
      });
    }

    return {
      supplierId: id,
      amount: input.amount,
      balanceAfter: toNumber(newBalance),
      transactionId: txn.id,
    };
  });
}

/** Receive money from supplier when balance is negative (they owe us after returns). */
export async function recordSupplierRefund(
  tenantId: string,
  userId: string,
  id: string,
  input: SupplierPaymentInput
) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({ where: { id, tenantId } });
    if (!supplier) throw new NotFoundError('Supplier not found');

    const balance = toDecimal(supplier.currentBalance);
    if (balance.greaterThanOrEqualTo(0)) {
      throw new BadRequestError('No recoverable amount from this supplier');
    }

    const recoverable = toNumber(balance.abs());
    if (input.amount > recoverable + 0.0001) {
      throw new BadRequestError(`Refund cannot exceed recoverable amount of ${recoverable}`);
    }

    const newBalance = add(supplier.currentBalance, input.amount);

    await tx.supplier.update({
      where: { id },
      data: { currentBalance: newBalance, updatedBy: userId },
    });

    const txn = await tx.accountTransaction.create({
      data: {
        tenantId,
        partyType: 'SUPPLIER',
        partyId: id,
        type: 'REFUND',
        amount: input.amount,
        balanceAfter: newBalance,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        createdBy: userId,
        referenceType: 'SUPPLIER_REFUND',
      },
    });

    if (input.paymentMethod === 'CASH') {
      await recordCashTxn(tx, {
        tenantId,
        type: 'REFUND',
        amount: input.amount,
        direction: 'IN',
        referenceType: 'SUPPLIER_REFUND',
        referenceId: txn.id,
        notes: input.notes,
        createdBy: userId,
      });
    }

    return {
      supplierId: id,
      amount: input.amount,
      balanceAfter: toNumber(newBalance),
      transactionId: txn.id,
    };
  });
}

export async function listSupplierTransactions(
  tenantId: string,
  id: string,
  query: { page?: number; limit?: number }
) {
  await getSupplier(tenantId, id);
  const { page, limit, skip, take } = parsePagination(query);
  const where = { tenantId, partyType: 'SUPPLIER' as const, partyId: id };
  const [total, items] = await Promise.all([
    prisma.accountTransaction.count({ where }),
    prisma.accountTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  const purchaseIds = [
    ...new Set(
      items
        .filter((t) => t.referenceType === 'PURCHASE' && t.referenceId)
        .map((t) => t.referenceId as string)
    ),
  ];
  const returnIds = [
    ...new Set(
      items
        .filter((t) => t.referenceType === 'PURCHASE_RETURN' && t.referenceId)
        .map((t) => t.referenceId as string)
    ),
  ];

  const [purchases, purchaseReturns] = await Promise.all([
    purchaseIds.length
      ? prisma.purchase.findMany({
          where: { tenantId, id: { in: purchaseIds } },
          select: { id: true, invoiceNumber: true },
        })
      : Promise.resolve([]),
    returnIds.length
      ? prisma.purchaseReturn.findMany({
          where: { tenantId, id: { in: returnIds } },
          select: {
            id: true,
            returnNumber: true,
            grandTotal: true,
            purchase: { select: { invoiceNumber: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const purchaseMap = new Map(purchases.map((p) => [p.id, p]));
  const returnMap = new Map(purchaseReturns.map((r) => [r.id, r]));

  return {
    items: items.map((t) => ({
      ...t,
      amount: toNumber(t.amount),
      balanceAfter: toNumber(t.balanceAfter),
      purchase:
        t.referenceType === 'PURCHASE' && t.referenceId
          ? purchaseMap.get(t.referenceId) ?? null
          : null,
      purchaseReturn:
        t.referenceType === 'PURCHASE_RETURN' && t.referenceId
          ? {
              ...returnMap.get(t.referenceId)!,
              grandTotal: returnMap.get(t.referenceId)
                ? toNumber(returnMap.get(t.referenceId)!.grandTotal)
                : 0,
            }
          : null,
    })),
    pagination: buildPaginationMeta(page, limit, total),
  };
}
