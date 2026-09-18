import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { toNumber } from '../utils/money';
import { recordCashTxn } from './cashSession.helper';
import type {
  ExpenseCategoryCreateInput,
  ExpenseCategoryUpdateInput,
  ExpenseCreateInput,
  ExpenseUpdateInput,
} from '../validators/expense.validators';

function serialize(expense: {
  id: string;
  tenantId: string;
  categoryId: string | null;
  amount: unknown;
  expenseDate: Date;
  paymentMethod: string;
  description: string | null;
  isVoided: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string } | null;
}) {
  return {
    ...expense,
    amount: toNumber(expense.amount as string),
  };
}

export async function listExpenseCategories(tenantId: string, activeOnly = true) {
  return prisma.expenseCategory.findMany({
    where: { tenantId, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: { name: 'asc' },
  });
}

export async function createExpenseCategory(tenantId: string, input: ExpenseCategoryCreateInput) {
  try {
    return await prisma.expenseCategory.create({
      data: {
        tenantId,
        name: input.name.trim(),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('Expense category already exists');
    }
    throw err;
  }
}

export async function updateExpenseCategory(
  tenantId: string,
  id: string,
  input: ExpenseCategoryUpdateInput
) {
  const existing = await prisma.expenseCategory.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError('Expense category not found');

  try {
    return await prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('Expense category already exists');
    }
    throw err;
  }
}

export async function deleteExpenseCategory(tenantId: string, id: string) {
  const existing = await prisma.expenseCategory.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError('Expense category not found');

  return prisma.expenseCategory.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function listExpenses(
  tenantId: string,
  query: { page?: number; limit?: number; categoryId?: string; from?: Date; to?: Date }
) {
  const { page, limit, skip, take } = parsePagination(query);
  const where: Prisma.ExpenseWhereInput = {
    tenantId,
    isVoided: false,
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.from || query.to
      ? {
          expenseDate: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { expenseDate: 'desc' },
      skip,
      take,
    }),
  ]);

  return { items: items.map(serialize), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getExpense(tenantId: string, id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, tenantId },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!expense) throw new NotFoundError('Expense not found');
  return serialize(expense);
}

export async function createExpense(tenantId: string, userId: string, input: ExpenseCreateInput) {
  if (input.categoryId) {
    const cat = await prisma.expenseCategory.findFirst({
      where: { id: input.categoryId, tenantId },
    });
    if (!cat) throw new BadRequestError('Expense category not found');
  }

  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        tenantId,
        categoryId: input.categoryId ?? null,
        amount: input.amount,
        expenseDate: input.expenseDate ?? new Date(),
        paymentMethod: input.paymentMethod,
        description: input.description,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    if (input.paymentMethod === 'CASH') {
      await recordCashTxn(tx, {
        tenantId,
        type: 'EXPENSE',
        amount: input.amount,
        direction: 'OUT',
        referenceType: 'EXPENSE',
        referenceId: expense.id,
        notes: input.description,
        createdBy: userId,
      });
    }

    return serialize(expense);
  });
}

export async function updateExpense(
  tenantId: string,
  userId: string,
  id: string,
  input: ExpenseUpdateInput
) {
  await getExpense(tenantId, id);
  const expense = await prisma.expense.update({
    where: { id },
    data: {
      categoryId: input.categoryId === undefined ? undefined : input.categoryId,
      amount: input.amount,
      expenseDate: input.expenseDate,
      paymentMethod: input.paymentMethod,
      description: input.description,
      isVoided: input.isVoided,
      updatedBy: userId,
    },
    include: { category: { select: { id: true, name: true } } },
  });
  return serialize(expense);
}

export async function deleteExpense(tenantId: string, userId: string, id: string) {
  await getExpense(tenantId, id);
  const expense = await prisma.expense.update({
    where: { id },
    data: { isVoided: true, updatedBy: userId },
    include: { category: { select: { id: true, name: true } } },
  });
  return serialize(expense);
}
