import { describe, expect, it } from 'vitest';
import { dayLabel, eventHref, groupByDay } from './activityView';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).toISOString();
const now = new Date(2026, 9, 25, 15);

describe('activity view helpers', () => {
  it('labels Today, Yesterday and older days', () => {
    expect(dayLabel(at(2026, 9, 25, 1), now)).toBe('Today');
    expect(dayLabel(at(2026, 9, 24, 23), now)).toBe('Yesterday');
    expect(dayLabel(at(2026, 9, 1), now)).not.toMatch(/Today|Yesterday/);
  });
  it('groups consecutive events by local day, keeping order', () => {
    const items = [
      { id: 'a', date: at(2026, 9, 25, 14) },
      { id: 'b', date: at(2026, 9, 25, 9) },
      { id: 'c', date: at(2026, 9, 24, 9) },
    ];
    const g = groupByDay(items, now);
    expect(g.map((x) => [x.label, x.items.map((i) => i.id)])).toEqual([['Today', ['a', 'b']], ['Yesterday', ['c']]]);
  });
  it('links transactions to their drawer, other entities to their page', () => {
    expect(eventHref({ entity: 'transaction', entityId: 't 1', action: 'update' })).toBe('/dashboard/transaction?id=t%201');
    expect(eventHref({ entity: 'transaction', entityId: 't1', action: 'delete' })).toBe('/dashboard/transaction');
    expect(eventHref({ entity: 'customer', entityId: 'c1', action: 'delete' })).toBe('/dashboard/customer');
    expect(eventHref({ entity: 'payout', entityId: 'p1', action: 'create' })).toBe('/dashboard/payout');
    expect(eventHref({ entity: 'mystery', entityId: 'x', action: 'create' })).toBeNull();
  });
});
