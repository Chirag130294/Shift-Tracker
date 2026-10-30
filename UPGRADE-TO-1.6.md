# Upgrade to 1.6 (gross pay)

Replace every file in your GitHub repo with the ones in this folder. Two files are new: **pay.js** and **views-pay.js**.
Your Firestore rules do not change and your data is kept. Wait a minute after uploading, then press Ctrl+F5 (or close and reopen the installed app).

## What is new
- **Pay tab** (shows your currency sign in the bottom bar): gross pay for a pay period, what you have earned so far, a breakdown (base, premiums, weekend, stat holiday, overtime, paid leave), and every shift with its math. Arrows move between pay periods.
- **Calendar**: tap a pay day (the $ day) and a card shows the gross for that pay period. Tap it to open the Pay tab. Upcoming also shows the gross.
- **Settings, Pay** now has six screens:
  1. Rate and currency: $ (CAD, USD, AUD and more), pound, euro, rupee (INR, PKR, LKR, NPR), or your own symbol. Overtime multiplier. Extra pay on stat holidays.
  2. Shift premiums: start from a template (Hospital 8 and 12 hr, Office 8.5 hr, Plant 12 hr, blank), then edit the parts of the day (for example 7-3, 3-11, 11-7), the extra for each in $ per hour or % of base, and a weekend extra. A check card shows the pay for any shift.
  3. Unpaid breaks by shift length (8 h: 0.5, 12 h: 0.75, 8.5 h: 0.5 and so on).
  4. Sick and leave pay: percent of base for each bank (sick at 70%, for example). It shows in the Pay tab automatically.
  5. Pay period and pay days: weekly, every 2 weeks (a known pay date, and how many days before pay day the period ends), twice a month (choose both days), monthly (pay day and the day a period starts on). Weekend rule: Friday before, Monday after, or keep the date. A preview lists your next pay days and the dates each one covers.
  6. How a shift counts by day: day it starts, day it ends, split at midnight, or the day with most hours. This decides the pay period and weekend rate of shifts that cross midnight.
- Pay date settings moved into this area. Your existing pay frequency and pay date are kept.

## Notes
- Overtime logged as "banked" is not paid. Overtime without a bank pays at your overtime multiplier.
- Leave days pay the percent set for their bank.
- If a shift length has no unpaid-break rule, the break saved on the shift in your shift library is used.
- Gross pay is an estimate before tax and deductions.

## Tests
`node tests/engine.test.mjs`, `v14.test.mjs`, `v15.test.mjs`, and `v16.test.mjs` (new, 15 groups for pay).
