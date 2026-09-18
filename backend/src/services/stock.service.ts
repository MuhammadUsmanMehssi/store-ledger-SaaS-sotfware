import type { Prisma, StockMovementType } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { add, div, mul, roundMoney, toDecimal, toNumber } from '../utils/money';

type TxClient = Prisma.TransactionClient;

export interface ApplyStockChangeInput {
  tenantId: string;
  productId: string;
  quantityDelta: Prisma.Decimal | number | string;
  type: StockMovementType;
  unitCost?: Prisma.Decimal | number | string;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  notes?: string;
  createdBy?: string;
  allowNegative?: boolean;
}

/**
 * Apply a stock change inside an existing transaction.
 * Positive quantityDelta increases stock; negative decreases it.
 * Weighted-average cost is updated when stock increases with a unit cost
 * (PURCHASE, OPENING, SALE_RETURN).
 */
export async function applyStockChange(tx: TxClient, input: ApplyStockChangeInput) {
  const product = await tx.product.findFirst({
    where: {
      id: input.productId,
      tenantId: input.tenantId,
      deletedAt: null,
    },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const delta = toDecimal(input.quantityDelta);
  const currentStock = toDecimal(product.currentStock);
  const newStock = add(currentStock, delta);

  if (newStock.lessThan(0) && !input.allowNegative) {
    throw new BadRequestError(
      `Insufficient stock for "${product.name}". Available: ${toNumber(currentStock)}, requested change: ${toNumber(delta)}`
    );
  }

  let avgCost = toDecimal(product.avgCost);
  const unitCost = input.unitCost !== undefined ? toDecimal(input.unitCost) : avgCost;

  const incomingTypes: StockMovementType[] = ['PURCHASE', 'OPENING', 'SALE_RETURN'];
  if (delta.greaterThan(0) && incomingTypes.includes(input.type) && unitCost.greaterThanOrEqualTo(0)) {
    const totalQty = add(currentStock, delta);
    if (totalQty.greaterThan(0)) {
      const existingValue = mul(currentStock, avgCost);
      const incomingValue = mul(delta, unitCost);
      avgCost = roundMoney(div(add(existingValue, incomingValue), totalQty));
    } else {
      avgCost = unitCost;
    }
  }

  const updated = await tx.product.update({
    where: { id: product.id },
    data: {
      currentStock: newStock,
      avgCost,
      ...(input.type === 'PURCHASE' && unitCost.greaterThan(0)
        ? { purchasePrice: unitCost }
        : {}),
    },
  });

  const movement = await tx.stockMovement.create({
    data: {
      tenantId: input.tenantId,
      productId: product.id,
      type: input.type,
      quantity: delta,
      unitCost,
      balanceAfter: newStock,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      reason: input.reason,
      notes: input.notes,
      createdBy: input.createdBy,
    },
  });

  return {
    product: updated,
    movement,
    avgCost: toNumber(avgCost),
    balanceAfter: toNumber(newStock),
  };
}
