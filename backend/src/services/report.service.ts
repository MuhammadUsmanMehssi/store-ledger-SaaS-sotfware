import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { toNumber } from '../utils/money';
import { resolveDateRange } from '../utils/dateRange';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import type { ReportQuery } from '../validators/report.validators';

export async function salesReport(tenantId: string, query: ReportQuery) {
  const { from, to } = resolveDateRange(query);
  const { page, limit, skip, take } = parsePagination(query);

  const where: Prisma.SaleWhereInput = {
    tenantId,
    status: { in: ['COMPLETED', 'PARTIAL', 'PARTIALLY_RETURNED', 'RETURNED'] },
    saleDate: { gte: from, lte: to },
  };

  const [total, items, aggregates] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { saleDate: 'desc' },
      skip,
      take,
    }),
    prisma.sale.aggregate({
      where,
      _sum: { grandTotal: true, totalCost: true, profitAmount: true, paidAmount: true },
    }),
  ]);

  return {
    range: { from, to },
    summary: {
      totalSales: toNumber(aggregates._sum?.grandTotal),
      totalCogs: toNumber(aggregates._sum?.totalCost),
      totalProfit: toNumber(aggregates._sum?.profitAmount),
      totalPaid: toNumber(aggregates._sum?.paidAmount),
      count: total,
    },
    items: items.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      saleDate: s.saleDate,
      customer: s.customer,
      grandTotal: toNumber(s.grandTotal),
      totalCost: toNumber(s.totalCost),
      profitAmount: toNumber(s.profitAmount),
      paidAmount: toNumber(s.paidAmount),
      paymentMethod: s.paymentMethod,
      status: s.status,
    })),
    pagination: buildPaginationMeta(page, limit, total),
  };
}

export async function purchasesReport(tenantId: string, query: ReportQuery) {
  const { from, to } = resolveDateRange(query);
  const { page, limit, skip, take } = parsePagination(query);

  const where: Prisma.PurchaseWhereInput = {
    tenantId,
    status: { in: ['COMPLETED', 'PARTIALLY_RETURNED', 'RETURNED'] },
    purchaseDate: { gte: from, lte: to },
  };

  const [total, items, aggregates] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.purchase.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { purchaseDate: 'desc' },
      skip,
      take,
    }),
    prisma.purchase.aggregate({
      where,
      _sum: { grandTotal: true, paidAmount: true },
    }),
  ]);

  return {
    range: { from, to },
    summary: {
      totalPurchases: toNumber(aggregates._sum?.grandTotal),
      totalPaid: toNumber(aggregates._sum?.paidAmount),
      count: total,
    },
    items: items.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      purchaseDate: p.purchaseDate,
      supplier: p.supplier,
      grandTotal: toNumber(p.grandTotal),
      paidAmount: toNumber(p.paidAmount),
      status: p.status,
    })),
    pagination: buildPaginationMeta(page, limit, total),
  };
}

export async function inventoryReport(tenantId: string, query: ReportQuery) {
  const { from, to, label } = resolveDateRange(query);
  const { page, limit, skip, take } = parsePagination(query);

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, abbreviation: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.stockMovement.findMany({
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
      },
      select: {
        productId: true,
        quantity: true,
        type: true,
      },
    }),
  ]);

  const periodByProduct = new Map<string, { stockIn: number; stockOut: number }>();
  for (const m of movements) {
    const qty = toNumber(m.quantity);
    const entry = periodByProduct.get(m.productId) ?? { stockIn: 0, stockOut: 0 };
    if (qty >= 0) entry.stockIn += qty;
    else entry.stockOut += Math.abs(qty);
    periodByProduct.set(m.productId, entry);
  }

  const rows = products.map((p) => {
    const period = periodByProduct.get(p.id) ?? { stockIn: 0, stockOut: 0 };
    const currentStock = toNumber(p.currentStock);
    const avgCost = toNumber(p.avgCost);
    return {
      id: p.id,
      name: p.name,
      size: p.size,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category?.name ?? null,
      unit: p.unit ? `${p.unit.name}${p.unit.abbreviation ? ` (${p.unit.abbreviation})` : ''}` : null,
      currentStock,
      minimumStock: toNumber(p.minimumStock),
      avgCost,
      salePrice: toNumber(p.salePrice),
      stockValue: Number((currentStock * avgCost).toFixed(4)),
      periodIn: Number(period.stockIn.toFixed(4)),
      periodOut: Number(period.stockOut.toFixed(4)),
      periodNet: Number((period.stockIn - period.stockOut).toFixed(4)),
      isLowStock: currentStock <= toNumber(p.minimumStock),
    };
  });

  const totalValue = rows.reduce((s, r) => s + r.stockValue, 0);
  const lowStockCount = rows.filter((r) => r.isLowStock).length;
  const periodIn = rows.reduce((s, r) => s + r.periodIn, 0);
  const periodOut = rows.reduce((s, r) => s + r.periodOut, 0);

  return {
    range: { from, to, label },
    summary: {
      productCount: rows.length,
      totalStockValue: Number(totalValue.toFixed(4)),
      lowStockCount,
      periodStockIn: Number(periodIn.toFixed(4)),
      periodStockOut: Number(periodOut.toFixed(4)),
    },
    items: rows.slice(skip, skip + take),
    pagination: buildPaginationMeta(page, limit, rows.length),
  };
}

export async function expensesReport(tenantId: string, query: ReportQuery) {
  const { from, to } = resolveDateRange(query);
  const { page, limit, skip, take } = parsePagination(query);

  const where = {
    tenantId,
    isVoided: false,
    expenseDate: { gte: from, lte: to },
  };

  const [total, items, aggregates] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { expenseDate: 'desc' },
      skip,
      take,
    }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  return {
    range: { from, to },
    summary: {
      totalExpenses: toNumber(aggregates._sum?.amount),
      count: total,
    },
    items: items.map((e) => ({
      id: e.id,
      expenseDate: e.expenseDate,
      category: e.category,
      amount: toNumber(e.amount),
      paymentMethod: e.paymentMethod,
      description: e.description,
    })),
    pagination: buildPaginationMeta(page, limit, total),
  };
}

export async function profitLossReport(tenantId: string, query: ReportQuery) {
  const { from, to } = resolveDateRange(query);

  const [sales, expenses, saleReturns] = await Promise.all([
    prisma.sale.findMany({
      where: {
        tenantId,
        status: { in: ['COMPLETED', 'PARTIAL', 'PARTIALLY_RETURNED', 'RETURNED'] },
        saleDate: { gte: from, lte: to },
      },
      select: { grandTotal: true, totalCost: true, profitAmount: true },
    }),
    prisma.expense.findMany({
      where: { tenantId, isVoided: false, expenseDate: { gte: from, lte: to } },
      select: { amount: true },
    }),
    prisma.saleReturn.findMany({
      where: { tenantId, returnDate: { gte: from, lte: to } },
      select: { grandTotal: true },
    }),
  ]);

  const revenue = sales.reduce((s, x) => s + toNumber(x.grandTotal), 0);
  const cogs = sales.reduce((s, x) => s + toNumber(x.totalCost), 0);
  const grossProfit = sales.reduce((s, x) => s + toNumber(x.profitAmount), 0);
  const returns = saleReturns.reduce((s, x) => s + toNumber(x.grandTotal), 0);
  const expenseTotal = expenses.reduce((s, x) => s + toNumber(x.amount), 0);
  const netSales = revenue - returns;

  return {
    range: { from, to },
    revenue: Number(revenue.toFixed(4)),
    returns: Number(returns.toFixed(4)),
    netSales: Number(netSales.toFixed(4)),
    cogs: Number(cogs.toFixed(4)),
    grossProfit: Number(grossProfit.toFixed(4)),
    expenses: Number(expenseTotal.toFixed(4)),
    netProfit: Number((grossProfit - expenseTotal).toFixed(4)),
    note: 'COGS uses weighted-average cost captured on sale items (totalCost)',
  };
}
