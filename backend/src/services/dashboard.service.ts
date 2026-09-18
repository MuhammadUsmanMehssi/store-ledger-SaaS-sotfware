import { prisma } from '../config/prisma';
import { toNumber } from '../utils/money';
import { resolveDateRange, startOfDay } from '../utils/dateRange';
import type { DateRangeQuery } from '../validators/dashboard.validators';

export async function getDashboardStats(tenantId: string, query: DateRangeQuery) {
  const { from, to, label } = resolveDateRange(query);

  const [
    sales,
    purchases,
    expenses,
    saleReturns,
    productCount,
    customerCount,
    supplierCount,
    recentSales,
    cashSession,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: {
        tenantId,
        status: { in: ['COMPLETED', 'PARTIAL', 'PARTIALLY_RETURNED', 'RETURNED'] },
        saleDate: { gte: from, lte: to },
      },
      select: {
        id: true,
        grandTotal: true,
        totalCost: true,
        profitAmount: true,
        paidAmount: true,
        saleDate: true,
        invoiceNumber: true,
      },
    }),
    prisma.purchase.findMany({
      where: {
        tenantId,
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED', 'RETURNED'] },
        purchaseDate: { gte: from, lte: to },
      },
      select: { grandTotal: true, paidAmount: true, purchaseDate: true },
    }),
    prisma.expense.findMany({
      where: {
        tenantId,
        isVoided: false,
        expenseDate: { gte: from, lte: to },
      },
      select: { amount: true, expenseDate: true },
    }),
    prisma.saleReturn.findMany({
      where: { tenantId, returnDate: { gte: from, lte: to } },
      select: { grandTotal: true },
    }),
    prisma.product.count({ where: { tenantId, deletedAt: null } }),
    prisma.customer.count({ where: { tenantId, isActive: true } }),
    prisma.supplier.count({ where: { tenantId, isActive: true } }),
    prisma.sale.findMany({
      where: {
        tenantId,
        status: { in: ['COMPLETED', 'PARTIAL', 'PARTIALLY_RETURNED', 'RETURNED'] },
      },
      orderBy: { saleDate: 'desc' },
      take: 8,
      select: {
        id: true,
        invoiceNumber: true,
        grandTotal: true,
        profitAmount: true,
        saleDate: true,
        paymentMethod: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.cashSession.findFirst({
      where: { tenantId },
      orderBy: { sessionDate: 'desc' },
    }),
  ]);

  const products = await prisma.product.findMany({
    where: { tenantId, deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      currentStock: true,
      minimumStock: true,
      avgCost: true,
      salePrice: true,
    },
  });

  const lowStockProducts = products
    .filter((p) => toNumber(p.currentStock) <= toNumber(p.minimumStock))
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      currentStock: toNumber(p.currentStock),
      minimumStock: toNumber(p.minimumStock),
    }));

  const inventoryValue = products.reduce(
    (sum, p) => sum + toNumber(p.currentStock) * toNumber(p.avgCost),
    0
  );

  const salesTotal = sales.reduce((s, x) => s + toNumber(x.grandTotal), 0);
  const cogs = sales.reduce((s, x) => s + toNumber(x.totalCost), 0);
  const profit = sales.reduce((s, x) => s + toNumber(x.profitAmount), 0);
  const purchasesTotal = purchases.reduce((s, x) => s + toNumber(x.grandTotal), 0);
  const expensesTotal = expenses.reduce((s, x) => s + toNumber(x.amount), 0);
  const returnsTotal = saleReturns.reduce((s, x) => s + toNumber(x.grandTotal), 0);

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        tenantId,
        status: { in: ['COMPLETED', 'PARTIAL', 'PARTIALLY_RETURNED', 'RETURNED'] },
        saleDate: { gte: from, lte: to },
      },
    },
    select: {
      quantity: true,
      lineTotal: true,
      productId: true,
      product: { select: { name: true } },
    },
  });

  const topMap = new Map<string, { productId: string; name: string; qty: number; revenue: number }>();
  for (const item of saleItems) {
    const existing = topMap.get(item.productId) ?? {
      productId: item.productId,
      name: item.product.name,
      qty: 0,
      revenue: 0,
    };
    existing.qty += toNumber(item.quantity);
    existing.revenue += toNumber(item.lineTotal);
    topMap.set(item.productId, existing);
  }

  const topProducts = [...topMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => ({
      ...p,
      qty: Number(p.qty.toFixed(4)),
      revenue: Number(p.revenue.toFixed(4)),
    }));

  const chartMap = new Map<string, { date: string; sales: number; profit: number; purchases: number; expenses: number }>();
  const bump = (date: Date, key: 'sales' | 'profit' | 'purchases' | 'expenses', amount: number) => {
    const day = startOfDay(date).toISOString().slice(0, 10);
    const row = chartMap.get(day) ?? { date: day, sales: 0, profit: 0, purchases: 0, expenses: 0 };
    row[key] += amount;
    chartMap.set(day, row);
  };

  for (const s of sales) {
    bump(s.saleDate, 'sales', toNumber(s.grandTotal));
    bump(s.saleDate, 'profit', toNumber(s.profitAmount));
  }
  for (const p of purchases) bump(p.purchaseDate, 'purchases', toNumber(p.grandTotal));
  for (const e of expenses) bump(e.expenseDate, 'expenses', toNumber(e.amount));

  const chart = [...chartMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({
      date: row.date,
      sales: Number(row.sales.toFixed(2)),
      profit: Number(row.profit.toFixed(2)),
      purchases: Number(row.purchases.toFixed(2)),
      expenses: Number(row.expenses.toFixed(2)),
    }));

  const outOfStockCount = products.filter((p) => toNumber(p.currentStock) <= 0).length;

  return {
    range: { from, to, preset: label },
    sales: {
      count: sales.length,
      total: Number(salesTotal.toFixed(4)),
      cogs: Number(cogs.toFixed(4)),
      profit: Number(profit.toFixed(4)),
      returns: Number(returnsTotal.toFixed(4)),
      netSales: Number((salesTotal - returnsTotal).toFixed(4)),
    },
    purchases: {
      count: purchases.length,
      total: Number(purchasesTotal.toFixed(4)),
    },
    expenses: {
      count: expenses.length,
      total: Number(expensesTotal.toFixed(4)),
    },
    inventory: {
      productCount,
      lowStockCount: lowStockProducts.length,
      outOfStockCount,
      stockValue: Number(inventoryValue.toFixed(4)),
    },
    parties: {
      customers: customerCount,
      suppliers: supplierCount,
    },
    cashInHand: cashSession ? toNumber(cashSession.expectedCash) : 0,
    netProfit: Number((profit - expensesTotal).toFixed(4)),
    topProducts,
    recentSales: recentSales.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      grandTotal: toNumber(s.grandTotal),
      profitAmount: toNumber(s.profitAmount),
      saleDate: s.saleDate,
      paymentMethod: s.paymentMethod,
      customerName: s.customer?.name ?? 'Walk-in',
    })),
    lowStockProducts,
    chart,
  };
}
