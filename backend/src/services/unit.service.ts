import { prisma } from '../config/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { toNumber } from '../utils/money';
import type { UnitCreateInput, UnitUpdateInput } from '../validators/unit.validators';

function serializeUnit(unit: {
  id: string;
  tenantId: string;
  name: string;
  abbreviation: string;
  baseUnitId: string | null;
  conversionFactor: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...unit,
    conversionFactor: toNumber(unit.conversionFactor as string, 6),
  };
}

export async function listUnits(
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
            { abbreviation: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.unit.count({ where }),
    prisma.unit.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
  ]);

  return { items: items.map(serializeUnit), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getUnit(tenantId: string, id: string) {
  const unit = await prisma.unit.findFirst({ where: { id, tenantId } });
  if (!unit) throw new NotFoundError('Unit not found');
  return serializeUnit(unit);
}

export async function createUnit(tenantId: string, input: UnitCreateInput) {
  if (input.baseUnitId) {
    const base = await prisma.unit.findFirst({ where: { id: input.baseUnitId, tenantId } });
    if (!base) throw new BadRequestError('Base unit not found');
  }

  try {
    const unit = await prisma.unit.create({
      data: {
        tenantId,
        name: input.name,
        abbreviation: input.abbreviation,
        baseUnitId: input.baseUnitId ?? null,
        conversionFactor: input.conversionFactor ?? 1,
        isActive: input.isActive ?? true,
      },
    });
    return serializeUnit(unit);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ConflictError('Unit name already exists');
    }
    throw err;
  }
}

export async function updateUnit(tenantId: string, id: string, input: UnitUpdateInput) {
  await getUnit(tenantId, id);
  if (input.baseUnitId) {
    const base = await prisma.unit.findFirst({ where: { id: input.baseUnitId, tenantId } });
    if (!base) throw new BadRequestError('Base unit not found');
  }

  try {
    const unit = await prisma.unit.update({
      where: { id },
      data: {
        name: input.name,
        abbreviation: input.abbreviation,
        baseUnitId: input.baseUnitId === undefined ? undefined : input.baseUnitId,
        conversionFactor: input.conversionFactor,
        isActive: input.isActive,
      },
    });
    return serializeUnit(unit);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ConflictError('Unit name already exists');
    }
    throw err;
  }
}

export async function deleteUnit(tenantId: string, id: string) {
  await getUnit(tenantId, id);
  const inUse = await prisma.product.count({ where: { tenantId, unitId: id, deletedAt: null } });
  if (inUse > 0) {
    const unit = await prisma.unit.update({ where: { id }, data: { isActive: false } });
    return serializeUnit(unit);
  }
  await prisma.unit.delete({ where: { id } });
  return { id, deleted: true };
}
