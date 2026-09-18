import type { DateRangeQuery } from '../validators/dashboard.validators';

export function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function resolveDateRange(query: DateRangeQuery): { from: Date; to: Date; label: string } {
  const now = new Date();
  const preset = query.preset ?? (query.from || query.to ? 'custom' : 'today');

  switch (preset) {
    case 'yesterday': {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return { from: startOfDay(d), to: endOfDay(d), label: 'yesterday' };
    }
    case 'week': {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 6);
      return { from, to: endOfDay(now), label: 'week' };
    }
    case 'month': {
      const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      return { from, to: endOfDay(now), label: 'month' };
    }
    case 'last_month': {
      const from = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return { from, to, label: 'last_month' };
    }
    case 'year': {
      const from = startOfDay(new Date(now.getFullYear(), 0, 1));
      return { from, to: endOfDay(now), label: 'year' };
    }
    case 'custom': {
      const from = query.from ? startOfDay(query.from) : startOfDay(now);
      const to = query.to ? endOfDay(query.to) : endOfDay(now);
      return { from, to, label: 'custom' };
    }
    case 'today':
    default:
      return { from: startOfDay(now), to: endOfDay(now), label: 'today' };
  }
}
