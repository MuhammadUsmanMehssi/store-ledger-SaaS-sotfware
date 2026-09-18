import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ConflictError, NotFoundError } from '../utils/errors';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import type { BrandCreateInput, BrandUpdateInput } from '../validators/brand.validators';

export async function listBrands(
  tenantId: string,
  query: { page?: number; limit?: number; search?: string; isActive?: boolean }
) {
  const { page, limit, search, skip, take } = parsePagination(query);
  const where: Prisma.BrandWhereInput = {
    tenantId,
    ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.brand.count({ where }),
    prisma.brand.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take,
      include: { _count: { select: { products: true } } },
    }),
  ]);

  return { items, pagination: buildPaginationMeta(page, limit, total) };
}

export async function createBrand(tenantId: string, userId: string, input: BrandCreateInput) {
  try {
    return await prisma.brand.create({
      data: {
        tenantId,
        name: input.name.trim(),
        description: input.description ?? null,
        isActive: input.isActive ?? true,
        createdBy: userId,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('Brand already exists');
    }
    throw err;
  }
}

export async function updateBrand(
  tenantId: string,
  userId: string,
  id: string,
  input: BrandUpdateInput
) {
  const existing = await prisma.brand.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError('Brand not found');

  try {
    return await prisma.brand.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedBy: userId,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('Brand already exists');
    }
    throw err;
  }
}

export async function deleteBrand(tenantId: string, id: string) {
  const existing = await prisma.brand.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError('Brand not found');
  await prisma.brand.update({
    where: { id },
    data: { isActive: false },
  });
  return { id, deactivated: true };
}
