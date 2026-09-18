import type { CashTxnType, Prisma } from '@prisma/client';
import { BadRequestError } from '../utils/errors';
import { add, sub, toDecimal, toNumber } from '../utils/money';
import { startOfDay } from '../utils/dateRange';

type TxClient = Prisma.TransactionClient;

export function sessionDateOnly(date = new Date()): Date {
  const d = startOfDay(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export async function getOpenCashSession(tx: TxClient, tenantId: string, date = new Date()) {
  const sessionDate = sessionDateOnly(date);
  return tx.cashSession.findUnique({
    where: { tenantId_sessionDate: { tenantId, sessionDate } },
  });
}

export async function ensureOpenCashSession(
  tx: TxClient,
  tenantId: string,
  createdBy?: string,
  date = new Date()
) {
  const sessionDate = sessionDateOnly(date);
  const existing = await tx.cashSession.findUnique({
    where: { tenantId_sessionDate: { tenantId, sessionDate } },
  });

  if (existing) {
    if (existing.isClosed) {
      throw new BadRequestError('Cash session is already closed for today');
    }
    return existing;
  }

  return tx.cashSession.create({
    data: {
      tenantId,
      sessionDate,
      openingCash: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: 0,
      createdBy,
    },
  });
}

export async function requireOpenCashSession(
  tx: TxClient,
  tenantId: string,
  date = new Date(),
  createdBy?: string
) {
  return ensureOpenCashSession(tx, tenantId, createdBy, date);
}

export async function recordCashTxn(
  tx: TxClient,
  params: {
    tenantId: string;
    type: CashTxnType;
    amount: Prisma.Decimal | number | string;
    direction: 'IN' | 'OUT';
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
    date?: Date;
  }
) {
  const amount = toDecimal(params.amount);
  if (amount.lessThanOrEqualTo(0)) {
    return null;
  }

  const session = await requireOpenCashSession(
    tx,
    params.tenantId,
    params.date,
    params.createdBy
  );

  const cashIn = params.direction === 'IN' ? add(session.cashIn, amount) : toDecimal(session.cashIn);
  const cashOut = params.direction === 'OUT' ? add(session.cashOut, amount) : toDecimal(session.cashOut);
  const expectedCash = sub(add(session.openingCash, cashIn), cashOut);

  await tx.cashSession.update({
    where: { id: session.id },
    data: {
      cashIn,
      cashOut,
      expectedCash,
    },
  });

  return tx.cashTransaction.create({
    data: {
      tenantId: params.tenantId,
      cashSessionId: session.id,
      type: params.type,
      amount,
      direction: params.direction,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      notes: params.notes,
      createdBy: params.createdBy,
    },
  });
}

export function serializeCashSession(session: {
  id: string;
  tenantId: string;
  sessionDate: Date;
  openingCash: unknown;
  cashIn: unknown;
  cashOut: unknown;
  expectedCash: unknown;
  actualCash: unknown | null;
  difference: unknown | null;
  isClosed: boolean;
  closedAt: Date | null;
  closedBy: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...session,
    openingCash: toNumber(session.openingCash as string),
    cashIn: toNumber(session.cashIn as string),
    cashOut: toNumber(session.cashOut as string),
    expectedCash: toNumber(session.expectedCash as string),
    actualCash: session.actualCash == null ? null : toNumber(session.actualCash as string),
    difference: session.difference == null ? null : toNumber(session.difference as string),
  };
}
