import test from 'node:test';
import assert from 'node:assert/strict';
import { chartBuckets, fuelEfficiencies, localDay, makeRecord, overlapsTrip, toCsv, totalMiles } from './mileage.mjs';

const trip = (start, end, date) => makeRecord('trip', { start: String(start), end: String(end) }, date);
const fuel = (odometer, gallons, full, day) => makeRecord('fuel',
  { odometer: String(odometer), gallons: String(gallons), full }, new Date(2026, 0, day, 8, 30));

test('validates odometer and fuel inputs and prevents overlapping trip ranges', () => {
  const existing = trip(10, 50);
  assert.throws(() => trip(50, 20), /Ending odometer/);
  assert.throws(() => trip('', 20), /starting odometer/);
  assert.throws(() => fuel(500, 0, true, 1), /gallon/);
  assert.equal(overlapsTrip(trip(49, 60), [existing]), true);
  assert.equal(overlapsTrip(trip(50, 60), [existing]), false);
  assert.equal(totalMiles([existing, trip(50, 60), fuel(500, 10, true, 1)]), 50);
});

test('captures the device timestamp and calendar date on save', () => {
  const now = new Date(2026, 0, 1, 0, 4);
  const r = makeRecord('fuel', { odometer: '600', gallons: '10,5', full: true }, now);
  assert.equal(r.timestamp, now.toISOString());
  assert.equal(r.day, '2026-01-01');
  assert.equal(r.utcOffsetMinutes, -now.getTimezoneOffset());
  assert.equal(r.gallons, 10.5);
});

test('uses intervening partial fills and excludes the baseline fill from MPG', () => {
  const first = fuel(500, 15, true, 1);
  const partial = fuel(600, 4, false, 2);
  const last = fuel(800, 6, true, 3);
  const results = fuelEfficiencies([last, partial, first]);
  assert.equal(results.has(first.id), false);
  assert.equal(results.has(partial.id), false);
  assert.equal(results.get(last.id), 30);
});

test('groups trips by local day, Monday-start week, and month', () => {
  const now = new Date(2026, 1, 2, 12);
  const previous = new Date(2026, 0, 31, 23);
  const records = [trip(100, 110, previous), trip(110, 125, now), fuel(125, 8, true, 3)];
  const daily = chartBuckets(records, 'Daily', now);
  assert.equal(daily.find((b) => b.key === localDay(previous)).miles, 10);
  for (const period of ['Weekly', 'Monthly']) {
    const buckets = chartBuckets(records, period, now);
    assert.deepEqual(buckets.slice(-2).map((b) => b.miles), [10, 15]);
  }
  assert.equal(daily.at(-1).miles, 15);
});

test('exports both record types as spreadsheet-ready CSV with calculated fields', () => {
  const date = new Date(2026, 0, 1, 10);
  const csv = toCsv([trip(10, 20, date), fuel(100, 7, true, 1), fuel(250, 5, true, 2)]);
  const [header, tripRow, , fuelRow] = csv.trimEnd().split('\r\n');
  assert.match(header, /"trip_miles".*"mpg"/);
  assert.match(tripRow, /"10","20","10","","","",""$/);
  assert.match(fuelRow, /"250","5","true","30.00"$/);
});
