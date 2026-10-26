// Statutory holidays, calculated offline from rules. Always check against your employer's list:
// use "Add your own holiday" in Settings for anything missing or different.
import { ymd, weekday, addDays, mod, daysInMonth } from './engine.js';

// nth weekday (0 = Sunday) of a month (1 to 12)
function nth(y, m, wd, n) {
  const first = ymd(y, m, 1);
  return addDays(first, mod(wd - weekday(first), 7) + (n - 1) * 7);
}
function lastWeekday(y, m, wd) {
  const end = ymd(y, m, daysInMonth(y, m));
  return addDays(end, -mod(weekday(end) - wd, 7));
}
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(y, month, day);
}
// Monday before May 25
function victoriaDay(y) {
  const d = ymd(y, 5, 24);
  return addDays(d, -mod(weekday(d) - 1, 7));
}

export const REGIONS = {
  CA: [
    { id: 'ON', name: 'Ontario' },
    { id: 'BC', name: 'British Columbia' },
    { id: 'AB', name: 'Alberta' },
    { id: 'FED', name: 'Canada (federal list)' }
  ],
  US: [{ id: 'US', name: 'Federal holidays' }]
};

export function holidaysFor(y, country, region) {
  const H = {};
  const add = (d, name) => { H[d] = name; };
  if (country === 'CA') {
    add(ymd(y, 1, 1), "New Year's Day");
    add(addDays(easter(y), -2), 'Good Friday');
    add(ymd(y, 7, 1), 'Canada Day');
    add(nth(y, 9, 1, 1), 'Labour Day');
    add(nth(y, 10, 1, 2), 'Thanksgiving');
    add(ymd(y, 12, 25), 'Christmas Day');
    add(victoriaDay(y), 'Victoria Day');
    if (region === 'ON') {
      add(nth(y, 2, 1, 3), 'Family Day');
      add(ymd(y, 12, 26), 'Boxing Day');
    } else if (region === 'BC') {
      add(nth(y, 2, 1, 3), 'Family Day');
      add(nth(y, 8, 1, 1), 'BC Day');
      add(ymd(y, 9, 30), 'Truth and Reconciliation Day');
      add(ymd(y, 11, 11), 'Remembrance Day');
    } else if (region === 'AB') {
      add(nth(y, 2, 1, 3), 'Family Day');
      add(ymd(y, 11, 11), 'Remembrance Day');
    } else {
      add(addDays(easter(y), 1), 'Easter Monday');
      add(ymd(y, 9, 30), 'Truth and Reconciliation Day');
      add(ymd(y, 11, 11), 'Remembrance Day');
      add(ymd(y, 12, 26), 'Boxing Day');
    }
  } else if (country === 'US') {
    add(ymd(y, 1, 1), "New Year's Day");
    add(nth(y, 1, 1, 3), 'Martin Luther King Jr. Day');
    add(nth(y, 2, 1, 3), "Presidents' Day");
    add(lastWeekday(y, 5, 1), 'Memorial Day');
    add(ymd(y, 6, 19), 'Juneteenth');
    add(ymd(y, 7, 4), 'Independence Day');
    add(nth(y, 9, 1, 1), 'Labor Day');
    add(nth(y, 10, 1, 2), 'Columbus Day');
    add(ymd(y, 11, 11), 'Veterans Day');
    add(nth(y, 11, 4, 4), 'Thanksgiving');
    add(ymd(y, 12, 25), 'Christmas Day');
  }
  return H;
}
