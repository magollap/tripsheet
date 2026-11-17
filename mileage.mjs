export function localDay(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0')).join('-');
}

export function timestamp(now = new Date()) {
  return { timestamp: now.toISOString(), day: localDay(now), utcOffsetMinutes: -now.getTimezoneOffset() };
}

function parseReading(input, label, positive = false) {
  const value = Number(input);
  if (!/^\d+(?:[.,]\d+)?$/.test(input.trim()) || !Number.isFinite(value) || value < 0 || (positive && value === 0)) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return value;
}

export function makeRecord(type, fields, now = new Date()) {
  const base = { id: `${now.getTime()}-${Math.random().toString(36).slice(2)}`, type, ...timestamp(now) };
  const reading = (key, label, positive) => parseReading(fields[key].trim().replace(',', '.'), label, positive);
  if (type === 'fuel') {
    return { ...base, odometer: reading('odometer', 'odometer reading'), gallons: reading('gallons', 'gallon amount', true), full: fields.full };
  }
  const start = reading('start', 'starting odometer reading');
  const end = reading('end', 'ending odometer reading');
  if (end < start) throw new Error('Ending odometer must be at least the starting odometer.');
  return { ...base, start, end };
}

export const tripMiles = (record) => record.end - record.start;
export const totalMiles = (records) => records.filter((r) => r.type === 'trip').reduce((sum, r) => sum + tripMiles(r), 0);

export function overlapsTrip(record, records) {
  return record.type === 'trip' && record.end > record.start && records.some((other) =>
    other.type === 'trip' && other.end > other.start &&
    Math.max(other.start, record.start) < Math.min(other.end, record.end));
}

export function fuelEfficiencies(records) {
  const ordered = records.filter((r) => r.type === 'fuel').sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const results = new Map();
  let baseline;
  let gallons = 0;
  let previous;
  for (const fill of ordered) {
    if (previous && fill.odometer < previous.odometer) {
      baseline = undefined;
      gallons = 0;
    }
    previous = fill;
    if (baseline) gallons += fill.gallons;
    if (fill.full) {
      if (baseline && fill.odometer > baseline.odometer) {
        results.set(fill.id, (fill.odometer - baseline.odometer) / gallons);
      }
      baseline = fill;
      gallons = 0;
    }
  }
  return results;
}

export function chartBuckets(records, period, now = new Date()) {
  const month = period === 'Monthly';
  const count = period === 'Daily' ? 7 : period === 'Weekly' ? 6 : 6;
  const step = period === 'Weekly' ? 7 : 1;
  const anchor = new Date(now.getFullYear(), now.getMonth(), month ? 1 : now.getDate());
  if (period === 'Weekly') anchor.setDate(anchor.getDate() - (anchor.getDay() + 6) % 7);
  return Array.from({ length: count }, (_, index) => {
    const offset = (index - count + 1) * step;
    const start = new Date(anchor);
    if (month) start.setMonth(start.getMonth() + offset);
    else start.setDate(start.getDate() + offset);
    const end = new Date(start);
    if (month) end.setMonth(end.getMonth() + 1);
    else end.setDate(end.getDate() + step);
    return {
      key: localDay(start),
      label: month ? start.toLocaleDateString(undefined, { month: 'short' })
        : period === 'Weekly' ? start.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
        : start.toLocaleDateString(undefined, { weekday: 'short' }),
      miles: totalMiles(records.filter((r) => r.day >= localDay(start) && r.day < localDay(end))),
    };
  });
}

export function toCsv(records) {
  const efficiencies = fuelEfficiencies(records);
  const quote = (value) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const rows = [['type', 'timestamp_utc', 'local_date', 'utc_offset_minutes', 'start_odometer_mi', 'end_odometer_mi',
    'trip_miles', 'fuel_odometer_mi', 'us_gallons', 'full_tank', 'mpg']];
  for (const r of records) {
    rows.push([r.type, r.timestamp, r.day, r.utcOffsetMinutes, r.start, r.end,
      r.type === 'trip' ? tripMiles(r) : '', r.odometer, r.gallons, r.full, efficiencies.get(r.id)?.toFixed(2)]);
  }
  return rows.map((row) => row.map(quote).join(',')).join('\r\n') + '\r\n';
}
