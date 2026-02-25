export type DateRange = {
  from?: Date;
  to?: Date;
};

export function parseDateRange(query: any): DateRange {
  const rawFrom = query?.from;
  const rawTo = query?.to;

  const from = parseDate(rawFrom);
  const to = parseDate(rawTo);

  if (from && to && from.getTime() > to.getTime()) {
    // swap to keep it predictable rather than throwing
    return { from: to, to: from };
  }

  return { from, to };
}

function parseDate(value: any): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  const s = String(value).trim();

  // Support YYYY-MM-DD by converting to midnight UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? undefined : d;
  }

  // ISO datetime or other Date-parsable formats
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}
