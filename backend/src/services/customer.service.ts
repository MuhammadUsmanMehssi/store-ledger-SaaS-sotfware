import { prisma } from '../config/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { sub, toNumber } from '../utils/money';
import { recordCashTxn } from './cashSession.helper';
import type { PartyCreateInput, PartyUpdateInput, PaymentInput } from '../validators/customer.validators';

function serializeCustomer(c: {
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
    ...c,
    openingBalance: toNumber(c.openingBalance as string),
    currentBalance: toNumber(c.currentBalance as string),
  };
}

export async function listCustomers(
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
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
  ]);

  return { items: items.map(serializeCustomer), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getCustomer(tenantId: string, id: string) {
  const customer = await prisma.customer.findFirst({ where: { id, tenantId } });
  if (!customer) throw new NotFoundError('Customer not found');
  return serializeCustomer(customer);
}

export async function createCustomer(tenantId: string, userId: string, input: PartyCreateInput) {
  const opening = input.openingBalance ?? 0;

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
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
          partyType: 'CUSTOMER',
          partyId: customer.id,
          type: 'OPENING',
          amount: opening,
          balanceAfter: opening,
          notes: 'Opening balance',
          createdBy: userId,
        },
      });
    }

    return serializeCustomer(customer);
  });
}

export async function updateCustomer(
  tenantId: string,
  userId: string,
  id: string,
  input: PartyUpdateInput
) {
  await getCustomer(tenantId, id);
  const { openingBalance: _o, ...rest } = input;
  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...rest,
      phone: rest.phone === undefined ? undefined : rest.phone,
      email: rest.email === undefined ? undefined : rest.email,
      address: rest.address === undefined ? undefined : rest.address,
      updatedBy: userId,
    },
  });
  return serializeCustomer(customer);
}

export async function deleteCustomer(tenantId: string, id: string) {
  await getCustomer(tenantId, id);
  const customer = await prisma.customer.update({
    where: { id },
    data: { isActive: false },
  });
  return serializeCustomer(customer);
}

export async function recordCustomerPayment(tenantId: string, userId: string, id: string, input: PaymentInput) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({ where: { id, tenantId } });
    if (!customer) throw new NotFoundError('Customer not found');

    const current = toNumber(customer.currentBalance);
    if (input.amount > current + 0.0001) {
      throw new BadRequestError(`Payment exceeds customer balance of ${current}`);
    }

    const newBalance = sub(customer.currentBalance, input.amount);

    await tx.customer.update({
      where: { id },
      data: { currentBalance: newBalance, updatedBy: userId },
    });

    const txn = await tx.accountTransaction.create({
      data: {
        tenantId,
        partyType: 'CUSTOMER',
        partyId: id,
        type: 'PAYMENT',
        amount: input.amount,
        balanceAfter: newBalance,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        createdBy: userId,
        referenceType: 'CUSTOMER_PAYMENT',
      },
    });

    if (input.paymentMethod === 'CASH') {
      await recordCashTxn(tx, {
        tenantId,
        type: 'CUSTOMER_PAYMENT',
        amount: input.amount,
        direction: 'IN',
        referenceType: 'CUSTOMER_PAYMENT',
        referenceId: txn.id,
        notes: input.notes,
        createdBy: userId,
      });
    }

    return {
      customerId: id,
      amount: input.amount,
      balanceAfter: toNumber(newBalance),
      transactionId: txn.id,
    };
  });
}

export async function listCustomerTransactions(tenantId: string, id: string, query: { page?: number; limit?: number }) {
  await getCustomer(tenantId, id);
  const { page, limit, skip, take } = parsePagination(query);
  const where = { tenantId, partyType: 'CUSTOMER' as const, partyId: id };
  const [total, items] = await Promise.all([
    prisma.accountTransaction.count({ where }),
    prisma.accountTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  const saleIds = [
    ...new Set(
      items
        .filter((t) => t.referenceType === 'SALE' && t.referenceId)
        .map((t) => t.referenceId as string)
    ),
  ];
  const returnIds = [
    ...new Set(
      items
        .filter((t) => t.referenceType === 'SALE_RETURN' && t.referenceId)
        .map((t) => t.referenceId as string)
    ),
  ];

  const [sales, saleReturns] = await Promise.all([
    saleIds.length
      ? prisma.sale.findMany({
          where: { tenantId, id: { in: saleIds } },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    flavor: true,
                    size: true,
                    sku: true,
                    barcode: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    returnIds.length
      ? prisma.saleReturn.findMany({
          where: { tenantId, id: { in: returnIds } },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    flavor: true,
                    size: true,
                    sku: true,
                    barcode: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const saleMap = new Map(sales.map((s) => [s.id, s]));
  const returnMap = new Map(saleReturns.map((r) => [r.id, r]));

  return {
    items: items.map((t) => {
      const sale =
        t.referenceType === 'SALE' && t.referenceId ? saleMap.get(t.referenceId) : undefined;
      const saleReturn =
        t.referenceType === 'SALE_RETURN' && t.referenceId
          ? returnMap.get(t.referenceId)
          : undefined;

      return {
        id: t.id,
        partyType: t.partyType,
        partyId: t.partyId,
        type: t.type,
        amount: toNumber(t.amount),
        balanceAfter: toNumber(t.balanceAfter),
        paymentMethod: t.paymentMethod,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        notes: t.notes,
        createdAt: t.createdAt,
        sale: sale
          ? {
              id: sale.id,
              invoiceNumber: sale.invoiceNumber,
              saleDate: sale.saleDate,
              grandTotal: toNumber(sale.grandTotal),
              paidAmount: toNumber(sale.paidAmount),
              remainingAmount: toNumber(sale.remainingAmount),
              paymentMethod: sale.paymentMethod,
              items: sale.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                quantity: toNumber(item.quantity),
                unitPrice: toNumber(item.unitPrice),
                discount: toNumber(item.discount),
                lineTotal: toNumber(item.lineTotal),
                product: item.product
                  ? {
                      id: item.product.id,
                      name: item.product.name,
                      flavor: item.product.flavor,
                      size: item.product.size,
                      sku: item.product.sku,
                      barcode: item.product.barcode,
                    }
                  : null,
              })),
            }
          : null,
        saleReturn: saleReturn
          ? {
              id: saleReturn.id,
              returnNumber: saleReturn.returnNumber,
              returnDate: saleReturn.returnDate,
              grandTotal: toNumber(saleReturn.grandTotal),
              items: saleReturn.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                quantity: toNumber(item.quantity),
                unitPrice: toNumber(item.unitPrice),
                lineTotal: toNumber(item.lineTotal),
                product: item.product
                  ? {
                      id: item.product.id,
                      name: item.product.name,
                      flavor: item.product.flavor,
                      size: item.product.size,
                      sku: item.product.sku,
                      barcode: item.product.barcode,
                    }
                  : null,
              })),
            }
          : null,
      };
    }),
    pagination: buildPaginationMeta(page, limit, total),
  };
}
