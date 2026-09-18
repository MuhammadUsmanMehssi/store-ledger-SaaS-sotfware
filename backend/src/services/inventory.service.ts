import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { BadRequestError } from '../utils/errors';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { toNumber } from '../utils/money';
import { applyStockChange } from './stock.service';
import type { AdjustStockInput } from '../validators/inventory.validators';

export async function listStock(
  tenantId: string,
  query: { page?: number; limit?: number; search?: string; lowStock?: boolean }
) {
  const { page, limit, search, skip, take } = parsePagination(query);
  const where: Prisma.ProductWhereInput = {
    tenantId,
    deletedAt: null,
    isActive: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const all = await prisma.product.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true, abbreviation: true } },
    },
    orderBy: { name: 'asc' },
  });

  const filtered = query.lowStock
    ? all.filter((p) => toNumber(p.currentStock) <= toNumber(p.minimumStock))
    : all;

  const items = filtered.slice(skip, skip + take).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    currentStock: toNumber(p.currentStock),
    minimumStock: toNumber(p.minimumStock),
    avgCost: toNumber(p.avgCost),
    purchasePrice: toNumber(p.purchasePrice),
    salePrice: toNumber(p.salePrice),
    stockValue: toNumber(p.currentStock) * toNumber(p.avgCost),
    isLowStock: toNumber(p.currentStock) <= toNumber(p.minimumStock),
    category: p.category,
    unit: p.unit,
  }));

  return { items, pagination: buildPaginationMeta(page, limit, filtered.length) };
}

export async function listMovements(
  tenantId: string,
  query: {
    page?: number;
    limit?: number;
    productId?: string;
    type?: Prisma.EnumStockMovementTypeFilter['equals'];
    from?: Date;
    to?: Date;
  }
) {
  const { page, limit, skip, take } = parsePagination(query);
  const where: Prisma.StockMovementWhereInput = {
    tenantId,
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return {
    items: items.map((m) => ({
      ...m,
      quantity: toNumber(m.quantity),
      unitCost: toNumber(m.unitCost),
      balanceAfter: toNumber(m.balanceAfter),
    })),
    pagination: buildPaginationMeta(page, limit, total),
  };
}

export async function adjustStock(tenantId: string, userId: string, input: AdjustStockInput) {
  if (input.quantity === 0) {
    throw new BadRequestError('Quantity adjustment cannot be zero');
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new BadRequestError('Tenant not found');

  return prisma.$transaction(async (tx) => {
    const result = await applyStockChange(tx, {
      tenantId,
      productId: input.productId,
      quantityDelta: input.quantity,
      type: 'ADJUSTMENT',
      unitCost: input.unitCost,
      reason: input.reason,
      notes: input.notes,
      createdBy: userId,
      allowNegative: tenant.allowNegativeStock,
      referenceType: 'ADJUSTMENT',
    });

    return {
      productId: result.product.id,
      name: result.product.name,
      currentStock: toNumber(result.product.currentStock),
      avgCost: toNumber(result.product.avgCost),
      movement: {
        id: result.movement.id,
        quantity: toNumber(result.movement.quantity),
        balanceAfter: toNumber(result.movement.balanceAfter),
        reason: result.movement.reason,
      },
    };
  });
}
