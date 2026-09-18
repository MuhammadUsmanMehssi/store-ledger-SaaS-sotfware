import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = Decimal.Value | null | undefined;

export function toDecimal(value: MoneyInput): Decimal {
  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }
  return new Decimal(value);
}

export function roundMoney(value: MoneyInput, places = 4): Decimal {
  return toDecimal(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
}

export function add(...values: MoneyInput[]): Decimal {
  return roundMoney(values.reduce<Decimal>((acc, v) => acc.plus(toDecimal(v)), new Decimal(0)));
}

export function sub(a: MoneyInput, b: MoneyInput): Decimal {
  return roundMoney(toDecimal(a).minus(toDecimal(b)));
}

export function mul(...values: MoneyInput[]): Decimal {
  return roundMoney(values.reduce<Decimal>((acc, v) => acc.times(toDecimal(v)), new Decimal(1)));
}

export function div(a: MoneyInput, b: MoneyInput): Decimal {
  const divisor = toDecimal(b);
  if (divisor.isZero()) {
    throw new Error('Division by zero');
  }
  return roundMoney(toDecimal(a).div(divisor));
}

export function toNumber(value: MoneyInput, places = 4): number {
  return roundMoney(value, places).toNumber();
}

export function toMoneyString(value: MoneyInput, places = 4): string {
  return roundMoney(value, places).toFixed(places);
}

export function isPositive(value: MoneyInput): boolean {
  return toDecimal(value).greaterThan(0);
}

export function isNegative(value: MoneyInput): boolean {
  return toDecimal(value).lessThan(0);
}

export function maxMoney(a: MoneyInput, b: MoneyInput): Decimal {
  const left = toDecimal(a);
  const right = toDecimal(b);
  return left.greaterThan(right) ? left : right;
}

export function minMoney(a: MoneyInput, b: MoneyInput): Decimal {
  const left = toDecimal(a);
  const right = toDecimal(b);
  return left.lessThan(right) ? left : right;
}
