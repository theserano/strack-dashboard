import { describe, expect, it } from 'vitest';
import { escapeCsvCell, toCsv } from './exportCsv';

describe('escapeCsvCell', () => {
  it('leaves plain text alone and blanks null', () => {
    expect(escapeCsvCell('hello')).toBe('hello');
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });
  it('quotes commas, quotes and newlines', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
  });
  it('neutralises formula starters', () => {
    for (const c of ['=1+1', '+1', '-1', '@SUM(A1)']) expect(escapeCsvCell(c)).toBe(`'${c}`);
    expect(escapeCsvCell('=a,b')).toBe(`"'=a,b"`);
  });
});

describe('toCsv', () => {
  it('writes a header and rows, keeping negative numbers numeric', () => {
    const csv = toCsv([{ n: 'A, Inc', t: -5 }], [
      { header: 'Name', value: (r) => r.n },
      { header: 'Total', value: (r) => r.t },
    ]);
    expect(csv).toBe('Name,Total\r\n"A, Inc",-5');
  });
  it('handles no rows', () => {
    expect(toCsv([], [{ header: 'X', value: () => '' }])).toBe('X');
  });
});
