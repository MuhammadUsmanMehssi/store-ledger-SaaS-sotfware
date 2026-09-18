import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import * as expenseService from '../services/expense.service';

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const activeOnly = req.query.all !== 'true';
  const data = await expenseService.listExpenseCategories(req.auth!.tenantId!, activeOnly);
  return success(res, data);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await expenseService.createExpenseCategory(req.auth!.tenantId!, req.body);
  return created(res, data, 'Expense category created');
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await expenseService.updateExpenseCategory(
    req.auth!.tenantId!,
    req.params.categoryId as string,
    req.body
  );
  return success(res, data, 'Expense category updated');
});

export const removeCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await expenseService.deleteExpenseCategory(
    req.auth!.tenantId!,
    req.params.categoryId as string
  );
  return success(res, data, 'Expense category removed');
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await expenseService.listExpenses(req.auth!.tenantId!, req.query as never);
  return success(res, result.items, 'Expenses retrieved', 200, result.pagination);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await expenseService.getExpense(req.auth!.tenantId!, req.params.id as string);
  return success(res, data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await expenseService.createExpense(req.auth!.tenantId!, req.auth!.userId, req.body);
  return created(res, data, 'Expense created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await expenseService.updateExpense(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string,
    req.body
  );
  return success(res, data, 'Expense updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const data = await expenseService.deleteExpense(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string
  );
  return success(res, data, 'Expense voided');
});
