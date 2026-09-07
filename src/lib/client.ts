import type { ApiResponse } from '@/domain/models';
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const csrf =
    typeof document !== 'undefined'
      ? document.cookie
          .split('; ')
          .find((c) => c.startsWith('rig_csrf='))
          ?.split('=')[1]
      : '';
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = (await res.json()) as ApiResponse<T>;
  if (!result.success) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}
export const number = (value: number | null | undefined, compact = false) =>
  value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('en-US', {
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : 0,
      }).format(value);
export const percent = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
export const date = (value: string, withTime = false) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'UTC',
  }).format(new Date(value));
export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const value = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
    return `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  };
  download(
    filename,
    [keys.map(cell).join(','), ...rows.map((r) => keys.map((k) => cell(r[k])).join(','))].join(
      '\r\n',
    ),
    'text/csv;charset=utf-8',
  );
}
export function download(filename: string, data: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
