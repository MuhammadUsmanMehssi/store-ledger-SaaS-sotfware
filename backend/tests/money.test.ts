import { describe, expect, it } from 'vitest';
import { add, div, mul, roundMoney, toDecimal } from '../src/utils/money';

describe('money utils', () => {
  it('avoids floating point money errors', () => {
    const a = toDecimal('0.1');
    const b = toDecimal('0.2');
    expect(add(a, b).toString()).toBe('0.3');
  });

  it('computes weighted average cost', () => {
    // 10 × 100 + 20 × 120 = 3400 / 30 = 113.3333
    const totalCost = add(mul(10, 100), mul(20, 120));
    const avg = roundMoney(div(totalCost, 30));
    expect(avg.toNumber()).toBeCloseTo(113.3333, 4);
  });
});
