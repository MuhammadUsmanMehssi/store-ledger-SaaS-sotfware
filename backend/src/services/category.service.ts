import { prisma } from '../config/prisma';
import { ConflictError, NotFoundError } from '../utils/errors';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import type { CategoryCreateInput, CategoryUpdateInput } from '../validators/category.validators';

export async function listCategories(
  tenantId: string,
  query: { page?: number; limit?: number; search?: string; isActive?: boolean }
) {
  const { page, limit, search, skip, take } = parsePagination(query);
  const where = {
    tenantId,
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
  ]);

  return { items, pagination: buildPaginationMeta(page, limit, total) };
}

export async function getCategory(tenantId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, tenantId } });
  if (!category) throw new NotFoundError('Category not found');
  return category;
}

export async function createCategory(tenantId: string, userId: string, input: CategoryCreateInput) {
  try {
    return await prisma.category.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description,
        isActive: input.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ConflictError('Category name already exists');
    }
    throw err;
  }
}

export async function updateCategory(
  tenantId: string,
  userId: string,
  id: string,
  input: CategoryUpdateInput
) {
  await getCategory(tenantId, id);
  try {
    return await prisma.category.update({
      where: { id },
      data: {
        ...input,
        updatedBy: userId,
      },
    });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ConflictError('Category name already exists');
    }
    throw err;
  }
}

export async function deleteCategory(tenantId: string, id: string) {
  await getCategory(tenantId, id);
  const productCount = await prisma.product.count({
    where: { tenantId, categoryId: id, deletedAt: null },
  });
  if (productCount > 0) {
    return prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
  await prisma.category.delete({ where: { id } });
  return { id, deleted: true };
}
