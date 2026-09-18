import { PaymentStatus, Prisma, SaleStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { nextDocumentNumber } from '../utils/documentNumber';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { add, maxMoney, minMoney, mul, roundMoney, sub, toDecimal, toNumber } from '../utils/money';
import { applyStockChange } from './stock.service';
import { recordCashTxn } from './cashSession.helper';
import type { CreateSaleInput, HoldSaleInput } from '../validators/sale.validators';

function paymentStatus(grandTotal: unknown, paid: unknown): PaymentStatus {
  const g = toDecimal(grandTotal as string | number);
  const p = toDecimal(paid as string | number);
  if (g.lessThanOrEqualTo(0)) return 'PAID';
  if (p.lessThanOrEqualTo(0)) return 'UNPAID';
  if (p.greaterThanOrEqualTo(g)) return 'PAID';
  return 'PARTIAL';
}

export function saleReturnFinancials(sale: {
  grandTotal: unknown;
  paidAmount: unknown;
  items?: Array<{ quantity: unknown; unitPrice: unknown; returnedQty: unknown }>;
}) {
  let returnedAmount = toDecimal(0);
  const itemNets =
    sale.items?.map((item) => {
      const qty = toDecimal(item.quantity);
      const returnedQty = toDecimal(item.returnedQty ?? 0);
      const unitPrice = toDecimal(item.unitPrice);
      const lineReturned = roundMoney(mul(returnedQty, unitPrice));
      returnedAmount = add(returnedAmount, lineReturned);
      const netQty = maxMoney(sub(qty, returnedQty), 0);
      const netLineTotal = roundMoney(mul(netQty, unitPrice));
      return {
        netQty: toNumber(netQty),
        netLineTotal: toNumber(netLineTotal),
        lineReturned: toNumber(lineReturned),
      };
    }) ?? [];

  const invoiceTotal = toDecimal(sale.grandTotal);
  const netTotal = maxMoney(sub(invoiceTotal, returnedAmount), 0);
  const paid = toDecimal(sale.paidAmount);
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

function serializeSale(sale: {
  id: string;
  tenantId: string;
  customerId: string | null;
  invoiceNumber: string;
  saleDate: Date;
  status: SaleStatus;
  subtotal: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  grandTotal: unknown;
  paidAmount: unknown;
  remainingAmount: unknown;
  changeAmount: unknown;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  totalCost: unknown;
  profitAmount: unknown;
  cashierId: string | null;
  notes: string | null;
  createdAt: Date;
  customer?: { id: string; name: string } | null;
  items?: Array<{
    id: string;
    productId: string;
    quantity: unknown;
    unitPrice: unknown;
    unitCost: unknown;
    discount: unknown;
    taxAmount: unknown;
    lineTotal: unknown;
    lineCost: unknown;
    lineProfit: unknown;
    returnedQty: unknown;
    product?: { id: string; name: string; barcode: string | null; size?: string | null };
  }>;
}) {
  const financials = saleReturnFinancials(sale);
  return {
    ...sale,
    subtotal: toNumber(sale.subtotal as string),
    discountAmount: toNumber(sale.discountAmount as string),
    taxAmount: toNumber(sale.taxAmount as string),
    grandTotal: toNumber(sale.grandTotal as string),
    paidAmount: toNumber(sale.paidAmount as string),
    remainingAmount: financials.remainingAmount,
    returnedAmount: financials.returnedAmount,
    netTotal: financials.netTotal,
    recoverable: financials.recoverable,
    changeAmount: toNumber(sale.changeAmount as string),
    paymentStatus: financials.paymentStatus,
    totalCost: toNumber(sale.totalCost as string),
    profitAmount: toNumber(sale.profitAmount as string),
    items: sale.items?.map((i, idx) => ({
      ...i,
      quantity: toNumber(i.quantity as string),
      unitPrice: toNumber(i.unitPrice as string),
      unitCost: toNumber(i.unitCost as string),
      discount: toNumber(i.discount as string),
      taxAmount: toNumber(i.taxAmount as string),
      lineTotal: toNumber(i.lineTotal as string),
      lineCost: toNumber(i.lineCost as string),
      lineProfit: toNumber(i.lineProfit as string),
      returnedQty: toNumber(i.returnedQty as string),
      netQty: financials.itemNets[idx]?.netQty ?? toNumber(i.quantity as string),
      netLineTotal:
        financials.itemNets[idx]?.netLineTotal ?? toNumber(i.lineTotal as string),
    })),
  };
}

export async function createSale(tenantId: string, userId: string, input: CreateSaleInput) {
  if (input.customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: input.customerId, tenantId } });
    if (!customer) throw new BadRequestError('Customer not found');
  }

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const productIds = input.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { tenantId, id: { in: productIds }, deletedAt: null, isActive: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = toDecimal(0);
    let totalCost = toDecimal(0);
    const lineItems: Array<{
      productId: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      discount: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      lineCost: Prisma.Decimal;
      lineProfit: Prisma.Decimal;
    }> = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestError(`Product not found: ${item.productId}`);

      const qty = toDecimal(item.quantity);
      const unitPrice = toDecimal(item.unitPrice ?? product.salePrice);
      const unitCost = toDecimal(product.avgCost);
      const discount = toDecimal(item.discount ?? 0);
      const lineTotal = roundMoney(sub(mul(qty, unitPrice), discount));
      const lineCost = roundMoney(mul(qty, unitCost));
      const lineProfit = roundMoney(sub(lineTotal, lineCost));

      subtotal = add(subtotal, lineTotal);
      totalCost = add(totalCost, lineCost);

      lineItems.push({
        productId: item.productId,
        quantity: qty,
        unitPrice,
        unitCost,
        discount,
        taxAmount: toDecimal(0),
        lineTotal,
        lineCost,
        lineProfit,
      });
    }

    const discountAmount = toDecimal(input.discountAmount ?? 0);
    const taxAmount = toDecimal(input.taxAmount ?? 0);
    const grandTotal = roundMoney(add(sub(subtotal, discountAmount), taxAmount));
    const paidAmount = toDecimal(input.paidAmount);
    const remainingAmount = maxMoney(sub(grandTotal, paidAmount), 0);
    const changeAmount = maxMoney(sub(paidAmount, grandTotal), 0);

    if (input.paymentMethod === 'CREDIT' && !input.customerId) {
      throw new BadRequestError('Customer is required for credit sales');
    }
    if (remainingAmount.greaterThan(0) && !input.customerId) {
      throw new BadRequestError('Customer is required when sale is not fully paid');
    }

    const invoiceNumber = await nextDocumentNumber(tx, tenantId, 'INVOICE', tenant.invoicePrefix);

    const sale = await tx.sale.create({
      data: {
        tenantId,
        customerId: input.customerId ?? null,
        invoiceNumber,
        saleDate: input.saleDate ?? new Date(),
        status: 'COMPLETED',
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal,
        paidAmount,
        remainingAmount,
        changeAmount,
        paymentMethod: input.paymentMethod,
        paymentStatus: paymentStatus(grandTotal, paidAmount),
        totalCost,
        profitAmount: roundMoney(sub(grandTotal, totalCost)),
        cashierId: userId,
        notes: input.notes,
        createdBy: userId,
        updatedBy: userId,
        items: { create: lineItems },
      },
      include: {
        customer: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, barcode: true, size: true } } } },
      },
    });

    for (const item of lineItems) {
      await applyStockChange(tx, {
        tenantId,
        productId: item.productId,
        quantityDelta: toDecimal(item.quantity).negated(),
        type: 'SALE',
        unitCost: item.unitCost,
        referenceType: 'SALE',
        referenceId: sale.id,
        createdBy: userId,
        allowNegative: tenant.allowNegativeStock,
      });
    }

    if (input.customerId) {
      const customer = await tx.customer.findFirstOrThrow({
        where: { id: input.customerId, tenantId },
      });
      const afterSale = add(customer.currentBalance, grandTotal);
      await tx.accountTransaction.create({
        data: {
          tenantId,
          partyType: 'CUSTOMER',
          partyId: customer.id,
          type: 'SALE',
          amount: grandTotal,
          balanceAfter: afterSale,
          paymentMethod: input.paymentMethod,
          referenceType: 'SALE',
          referenceId: sale.id,
          createdBy: userId,
        },
      });

      let finalBalance = afterSale;
      const appliedPayment = paidAmount.greaterThan(grandTotal) ? grandTotal : paidAmount;
      if (appliedPayment.greaterThan(0)) {
        finalBalance = sub(afterSale, appliedPayment);
        await tx.accountTransaction.create({
          data: {
            tenantId,
            partyType: 'CUSTOMER',
            partyId: customer.id,
            type: 'PAYMENT',
            amount: appliedPayment,
            balanceAfter: finalBalance,
            paymentMethod: input.paymentMethod,
            referenceType: 'SALE',
            referenceId: sale.id,
            createdBy: userId,
          },
        });
      }

      await tx.customer.update({
        where: { id: customer.id },
        data: { currentBalance: finalBalance },
      });
    }

    const cashReceived = paidAmount.greaterThan(grandTotal) ? grandTotal : paidAmount;
    if (cashReceived.greaterThan(0) && (input.paymentMethod === 'CASH' || input.paymentMethod === 'MIXED')) {
      await recordCashTxn(tx, {
        tenantId,
        type: 'SALE',
        amount: cashReceived,
        direction: 'IN',
        referenceType: 'SALE',
        referenceId: sale.id,
        createdBy: userId,
      });
    }

    if (input.heldSaleId) {
      const held = await tx.heldSale.findFirst({ where: { id: input.heldSaleId, tenantId } });
      if (held) {
        await tx.heldSale.delete({ where: { id: held.id } });
      }
    }

    return serializeSale(sale);
  });
}

export async function listSales(
  tenantId: string,
  query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: SaleStatus;
    customerId?: string;
    from?: Date;
    to?: Date;
  }
) {
  const { page, limit, search, skip, take } = parsePagination(query);
  const where: Prisma.SaleWhereInput = {
    tenantId,
    ...(query.status ? { status: query.status } : { status: { not: 'HELD' } }),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(search ? { invoiceNumber: { contains: search, mode: 'insensitive' } } : {}),
    ...(query.from || query.to
      ? {
          saleDate: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, barcode: true, size: true } } } },
      },
      orderBy: { saleDate: 'desc' },
      skip,
      take,
    }),
  ]);

  return { items: items.map(serializeSale), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getSale(tenantId: string, id: string) {
  const sale = await prisma.sale.findFirst({
    where: { id, tenantId },
    include: {
      customer: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, barcode: true, size: true } } } },
    },
  });
  if (!sale) throw new NotFoundError('Sale not found');
  return serializeSale(sale);
}

export async function holdSale(tenantId: string, userId: string, input: HoldSaleInput) {
  for (const item of input.items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, tenantId, deletedAt: null },
    });
    if (!product) throw new BadRequestError(`Product not found: ${item.productId}`);
  }

  const held = await prisma.heldSale.create({
    data: {
      tenantId,
      customerId: input.customerId ?? null,
      referenceName: input.referenceName,
      discountAmount: input.discountAmount ?? 0,
      notes: input.notes,
      createdBy: userId,
      items: {
        create: input.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice ?? 0,
          discount: i.discount ?? 0,
        })),
      },
    },
    include: {
      customer: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, salePrice: true } } } },
    },
  });

  return {
    ...held,
    discountAmount: toNumber(held.discountAmount),
    items: held.items.map((i) => ({
      ...i,
      quantity: toNumber(i.quantity),
      unitPrice: toNumber(i.unitPrice),
      discount: toNumber(i.discount),
      product: i.product
        ? { ...i.product, salePrice: toNumber(i.product.salePrice) }
        : i.product,
    })),
  };
}

export async function listHeldSales(tenantId: string) {
  const items = await prisma.heldSale.findMany({
    where: { tenantId },
    include: {
      customer: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, salePrice: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return items.map((held) => ({
    ...held,
    discountAmount: toNumber(held.discountAmount),
    items: held.items.map((i) => ({
      ...i,
      quantity: toNumber(i.quantity),
      unitPrice: toNumber(i.unitPrice),
      discount: toNumber(i.discount),
      product: i.product
        ? { ...i.product, salePrice: toNumber(i.product.salePrice) }
        : i.product,
    })),
  }));
}

export async function getHeldSale(tenantId: string, id: string) {
  const held = await prisma.heldSale.findFirst({
    where: { id, tenantId },
    include: {
      customer: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, salePrice: true } } } },
    },
  });
  if (!held) throw new NotFoundError('Held sale not found');
  return {
    ...held,
    discountAmount: toNumber(held.discountAmount),
    items: held.items.map((i) => ({
      ...i,
      quantity: toNumber(i.quantity),
      unitPrice: toNumber(i.unitPrice),
      discount: toNumber(i.discount),
      product: i.product
        ? { ...i.product, salePrice: toNumber(i.product.salePrice) }
        : i.product,
    })),
  };
}

export async function deleteHeldSale(tenantId: string, id: string) {
  const held = await prisma.heldSale.findFirst({ where: { id, tenantId } });
  if (!held) throw new NotFoundError('Held sale not found');
  await prisma.heldSale.delete({ where: { id } });
  return { id, deleted: true };
}
