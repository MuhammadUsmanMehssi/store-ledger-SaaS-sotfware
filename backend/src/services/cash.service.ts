import { prisma } from '../config/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { add, sub, toNumber } from '../utils/money';
import {
  serializeCashSession,
  sessionDateOnly,
} from './cashSession.helper';
import type {
  CloseSessionInput,
  OpenSessionInput,
  UpdateClosingInput,
  UpdateOpeningInput,
} from '../validators/cash.validators';

function hasBusinessActivity(session: {
  cashIn: unknown;
  cashOut: unknown;
  transactions?: Array<{ type: string }>;
}) {
  const cashIn = toNumber(session.cashIn as string);
  const cashOut = toNumber(session.cashOut as string);
  if (cashIn > 0 || cashOut > 0) return true;
  const businessTypes = new Set([
    'SALE',
    'CUSTOMER_PAYMENT',
    'EXPENSE',
    'SUPPLIER_PAYMENT',
    'REFUND',
    'ADJUSTMENT',
  ]);
  return (session.transactions ?? []).some((t) => businessTypes.has(t.type));
}

/**
 * expectedCash = openingCash + cashIn - cashOut
 * difference = actualCash - expectedCash
 */
export async function getTodaySession(tenantId: string) {
  const sessionDate = sessionDateOnly();
  const session = await prisma.cashSession.findUnique({
    where: { tenantId_sessionDate: { tenantId, sessionDate } },
    include: {
      transactions: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!session) {
    return null;
  }

  return {
    ...serializeCashSession(session),
    canCancel: !session.isClosed && !hasBusinessActivity(session),
    transactions: session.transactions.map((t) => ({
      ...t,
      amount: toNumber(t.amount),
    })),
    formula: {
      expectedCash: 'openingCash + cashIn - cashOut',
      difference: 'actualCash - expectedCash',
    },
  };
}

export async function openSession(tenantId: string, userId: string, input: OpenSessionInput) {
  const sessionDate = sessionDateOnly();
  const existing = await prisma.cashSession.findUnique({
    where: { tenantId_sessionDate: { tenantId, sessionDate } },
  });
  if (existing) {
    throw new ConflictError('Cash session already exists for today');
  }

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.cashSession.create({
      data: {
        tenantId,
        sessionDate,
        openingCash: input.openingCash,
        cashIn: 0,
        cashOut: 0,
        expectedCash: input.openingCash,
        notes: input.notes,
        createdBy: userId,
      },
    });

    await tx.cashTransaction.create({
      data: {
        tenantId,
        cashSessionId: created.id,
        type: 'OPENING',
        amount: input.openingCash,
        direction: 'IN',
        notes: 'Opening cash',
        createdBy: userId,
      },
    });

    return created;
  });

  return serializeCashSession(session);
}

export async function closeSession(tenantId: string, userId: string, input: CloseSessionInput) {
  const sessionDate = sessionDateOnly();
  const session = await prisma.cashSession.findUnique({
    where: { tenantId_sessionDate: { tenantId, sessionDate } },
  });
  if (!session) throw new NotFoundError('No cash session found for today');
  if (session.isClosed) throw new BadRequestError('Cash session is already closed');

  const expectedCash = sub(add(session.openingCash, session.cashIn), session.cashOut);
  const difference = sub(input.actualCash, expectedCash);

  const updated = await prisma.$transaction(async (tx) => {
    const closed = await tx.cashSession.update({
      where: { id: session.id },
      data: {
        expectedCash,
        actualCash: input.actualCash,
        difference,
        isClosed: true,
        closedAt: new Date(),
        closedBy: userId,
        notes: input.notes ?? session.notes,
      },
    });

    await tx.cashTransaction.create({
      data: {
        tenantId,
        cashSessionId: session.id,
        type: 'CLOSING',
        amount: input.actualCash,
        direction: 'IN',
        notes: `Closing — difference: ${toNumber(difference)}`,
        createdBy: userId,
      },
    });

    return closed;
  });

  return {
    ...serializeCashSession(updated),
    summary: {
      openingCash: toNumber(updated.openingCash),
      cashIn: toNumber(updated.cashIn),
      cashOut: toNumber(updated.cashOut),
      expectedCash: toNumber(expectedCash),
      actualCash: toNumber(input.actualCash),
      difference: toNumber(difference),
      formula: {
        expectedCash: 'openingCash + cashIn - cashOut',
        difference: 'actualCash - expectedCash',
      },
    },
  };
}

/** Undo accidental close — go back to open stage */
export async function reopenSession(tenantId: string, _userId: string) {
  const sessionDate = sessionDateOnly();
  const session = await prisma.cashSession.findUnique({
    where: { tenantId_sessionDate: { tenantId, sessionDate } },
  });
  if (!session) throw new NotFoundError('No cash session found for today');
  if (!session.isClosed) throw new BadRequestError('Cash session is already open');

  const expectedCash = sub(add(session.openingCash, session.cashIn), session.cashOut);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.cashTransaction.deleteMany({
      where: { cashSessionId: session.id, type: 'CLOSING' },
    });

    return tx.cashSession.update({
      where: { id: session.id },
      data: {
        isClosed: false,
        closedAt: null,
        closedBy: null,
        actualCash: null,
        difference: null,
        expectedCash,
        notes: session.notes ? `${session.notes}\nReopened` : 'Reopened',
      },
    });
  });

  return serializeCashSession(updated);
}

/** Undo accidental open — only if no sales/expenses/payments yet */
export async function cancelSession(tenantId: string) {
  const sessionDate = sessionDateOnly();
  const session = await prisma.cashSession.findUnique({
    where: { tenantId_sessionDate: { tenantId, sessionDate } },
    include: { transactions: true },
  });
  if (!session) throw new NotFoundError('No cash session found for today');
  if (session.isClosed) {
    throw new BadRequestError('Session is closed. Reopen it first, then cancel if needed.');
  }
  if (hasBusinessActivity(session)) {
    throw new BadRequestError(
      'Cannot cancel: cash movements already exist. Edit opening amount instead, or close the session.'
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.cashTransaction.deleteMany({ where: { cashSessionId: session.id } });
    await tx.cashSession.delete({ where: { id: session.id } });
  });

  return { success: true, message: 'Cash session cancelled' };
}

/** Fix wrong opening cash while session is still open */
export async function updateOpeningCash(
  tenantId: string,
  userId: string,
  input: UpdateOpeningInput
) {
  const sessionDate = sessionDateOnly();
  const session = await prisma.cashSession.findUnique({
    where: { tenantId_sessionDate: { tenantId, sessionDate } },
  });
  if (!session) throw new NotFoundError('No cash session found for today');
  if (session.isClosed) {
    throw new BadRequestError('Session is closed. Reopen it first to edit opening cash.');
  }

  const expectedCash = sub(add(input.openingCash, session.cashIn), session.cashOut);

  const updated = await prisma.$transaction(async (tx) => {
    const openingTxn = await tx.cashTransaction.findFirst({
      where: { cashSessionId: session.id, type: 'OPENING' },
      orderBy: { createdAt: 'asc' },
    });

    if (openingTxn) {
      await tx.cashTransaction.update({
        where: { id: openingTxn.id },
        data: {
          amount: input.openingCash,
          notes: input.notes || `Opening cash corrected (was ${toNumber(session.openingCash)})`,
        },
      });
    } else {
      await tx.cashTransaction.create({
        data: {
          tenantId,
          cashSessionId: session.id,
          type: 'OPENING',
          amount: input.openingCash,
          direction: 'IN',
          notes: input.notes || 'Opening cash corrected',
          createdBy: userId,
        },
      });
    }

    return tx.cashSession.update({
      where: { id: session.id },
      data: {
        openingCash: input.openingCash,
        expectedCash,
        notes: input.notes ?? session.notes,
      },
    });
  });

  return serializeCashSession(updated);
}

/** Fix wrong counted (actual) cash after close */
export async function updateClosingCash(
  tenantId: string,
  userId: string,
  input: UpdateClosingInput
) {
  const sessionDate = sessionDateOnly();
  const session = await prisma.cashSession.findUnique({
    where: { tenantId_sessionDate: { tenantId, sessionDate } },
  });
  if (!session) throw new NotFoundError('No cash session found for today');
  if (!session.isClosed) {
    throw new BadRequestError('Session is still open. Close it first, or enter the count when closing.');
  }

  const expectedCash = sub(add(session.openingCash, session.cashIn), session.cashOut);
  const difference = sub(input.actualCash, expectedCash);

  const updated = await prisma.$transaction(async (tx) => {
    const closingTxn = await tx.cashTransaction.findFirst({
      where: { cashSessionId: session.id, type: 'CLOSING' },
      orderBy: { createdAt: 'desc' },
    });

    if (closingTxn) {
      await tx.cashTransaction.update({
        where: { id: closingTxn.id },
        data: {
          amount: input.actualCash,
          notes:
            input.notes ||
            `Closing corrected — difference: ${toNumber(difference)} (was ${toNumber(session.actualCash ?? 0)})`,
        },
      });
    } else {
      await tx.cashTransaction.create({
        data: {
          tenantId,
          cashSessionId: session.id,
          type: 'CLOSING',
          amount: input.actualCash,
          direction: 'IN',
          notes: input.notes || `Closing corrected — difference: ${toNumber(difference)}`,
          createdBy: userId,
        },
      });
    }

    return tx.cashSession.update({
      where: { id: session.id },
      data: {
        expectedCash,
        actualCash: input.actualCash,
        difference,
        notes: input.notes ?? session.notes,
      },
    });
  });

  return serializeCashSession(updated);
}

export async function getSummary(tenantId: string) {
  const session = await getTodaySession(tenantId);
  if (!session) {
    return {
      open: false,
      message: 'No cash session for today',
      formula: {
        expectedCash: 'openingCash + cashIn - cashOut',
        difference: 'actualCash - expectedCash',
      },
    };
  }

  return {
    open: !session.isClosed,
    session,
    summary: {
      openingCash: session.openingCash,
      cashIn: session.cashIn,
      cashOut: session.cashOut,
      expectedCash: session.expectedCash,
      actualCash: session.actualCash,
      difference: session.difference,
    },
    formula: session.formula,
  };
}
