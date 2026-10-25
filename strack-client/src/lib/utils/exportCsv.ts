export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** Quotes a cell; prefixes a quote to cells a spreadsheet would run as a formula (= + - @, tab, CR). */
export const escapeCsvCell = (raw: string | number | null | undefined): string => {
  let s = raw == null ? '' : String(raw);
  // Leading whitespace is skipped by some spreadsheets before they decide it is a formula.
  // Phone numbers like "+234..." also get the quote: a safe default, deliberately kept.
  if (/^\s*[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Builds CSV text (CRLF rows). Numbers keep their own sign: only strings are formula-guarded. */
export const toCsv = <T,>(rows: T[], columns: CsvColumn<T>[]): string => {
  const cell = (v: string | number | null | undefined) => (typeof v === 'number' ? escapeCsvCell(v).replace(/^'/, '') : escapeCsvCell(v));
  const lines = [columns.map((c) => escapeCsvCell(c.header)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(','));
  return lines.join('\r\n');
};

/** Downloads rows as a CSV file (with a BOM so Excel reads UTF-8). */
export const exportCsv = <T,>(rows: T[], columns: CsvColumn<T>[], filename: string) => {
  const blob = new Blob(['﻿', toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
