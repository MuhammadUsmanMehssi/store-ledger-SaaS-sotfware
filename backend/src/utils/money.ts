import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/** Accepts numbers, strings, Decimal.js, Prisma.Decimal, nullish, or unknown serialized values. */
export type MoneyInput = Decimal.Value | null | undefined;

function coerceMoney(value: unknown): Decimal.Value | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (value instanceof Decimal) return value;
  // Prisma.Decimal and similar decimal-like objects
  if (typeof value === 'object' && value !== null && typeof (value as { toString?: unknown }).toString === 'function') {
    return String(value);
  }
  return null;
}

export function toDecimal(value: MoneyInput | unknown): Decimal {
  const coerced = coerceMoney(value as unknown);
  if (coerced === null || coerced === undefined) {
    return new Decimal(0);
  }
  return new Decimal(coerced);
}

export function roundMoney(value: MoneyInput | unknown, places = 4): Decimal {
  return toDecimal(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
}

export function add(...values: Array<MoneyInput | unknown>): Decimal {
  return roundMoney(values.reduce<Decimal>((acc, v) => acc.plus(toDecimal(v)), new Decimal(0)));
}

export function sub(a: MoneyInput | unknown, b: MoneyInput | unknown): Decimal {
  return roundMoney(toDecimal(a).minus(toDecimal(b)));
}

export function mul(...values: Array<MoneyInput | unknown>): Decimal {
  return roundMoney(values.reduce<Decimal>((acc, v) => acc.times(toDecimal(v)), new Decimal(1)));
}

export function div(a: MoneyInput | unknown, b: MoneyInput | unknown): Decimal {
  const divisor = toDecimal(b);
  if (divisor.isZero()) {
    throw new Error('Division by zero');
  }
  return roundMoney(toDecimal(a).div(divisor));
}

export function toNumber(value: MoneyInput | unknown, places = 4): number {
  return roundMoney(value, places).toNumber();
}

export function toMoneyString(value: MoneyInput | unknown, places = 4): string {
  return roundMoney(value, places).toFixed(places);
}

export function isPositive(value: MoneyInput | unknown): boolean {
  return toDecimal(value).greaterThan(0);
}

export function isNegative(value: MoneyInput | unknown): boolean {
  return toDecimal(value).lessThan(0);
}

export function maxMoney(a: MoneyInput | unknown, b: MoneyInput | unknown): Decimal {
  const left = toDecimal(a);
  const right = toDecimal(b);
  return left.greaterThan(right) ? left : right;
}

export function minMoney(a: MoneyInput | unknown, b: MoneyInput | unknown): Decimal {
  const left = toDecimal(a);
  const right = toDecimal(b);
  return left.lessThan(right) ? left : right;
}
