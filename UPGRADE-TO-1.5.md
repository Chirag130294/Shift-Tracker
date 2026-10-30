# Upgrade to v1.5 (from v1.4)

Your data is safe. Nothing is deleted. You do two small things: **1. update the Firebase rules (1 minute)**, **2. replace the files on GitHub**.

## Step 1: Firebase rules (one tiny change)
v1.5 can remember "don't count lieu for this holiday", which needs one new field allowed.
1. console.firebase.google.com > your project > **Build > Firestore Database > Rules**.
2. Delete everything in the box, paste the whole of **`firestore.rules`** from this package, click **Publish**.

## Step 2: Replace the files on GitHub
Keep your own `firebase-config.js` (do not upload the one in this package).
1. github.com > your repository **Shift-Tracker** > **Add file > Upload files**.
2. Drag in these files (top level, no folders):
   `index.html` `style.css` `app.js` `core.js` `engine.js` `banks.js` `share.js` `backend.js` `holidays.js`
   **`countries.js` (new)** `views-cal.js` `views-leave.js` `views-rot.js` `views-settings.js` `views-social.js` `sw.js`
3. **Commit changes.** Files with the same name are replaced automatically. `countries.js` is the only new file.
4. Wait about a minute. On your phone close the app completely and open it again (once, maybe twice). If it still looks old: Chrome menu > Settings > Site settings > shift-tracker > Clear & reset, then open it again. You stay logged in.

## What is new
**Look and feel**
- The tab bar and Save buttons are pinned to the bottom of the screen on every screen, whatever the screen or text size. While the keyboard is open the tab bar steps aside and Save stays visible.
- Tighter spacing everywhere. Calendar shows all banks in two small rows.
- Screens slide in and out. A small chip at the top shows Saving / Offline, will sync / Saved.
- Undo: after marking a day, booking time off, clearing a day or removing a holiday, a toast offers Undo for a few seconds (fewer "are you sure?" questions).
- Friendly empty screens, loading placeholders, plainer error messages, a light vibration on switches.
- Remembers your last bank when booking and your last export choices.

**Settings** is now a short menu (Instagram style): Profile, Sharing, Rotation, Shift library, Leave banks, Holidays and lieu, Country and region, Pay, Calendar and display, Export, Your data.

**Country and region**: any country in the world from a searchable list with an A to Z index, then a region list. Canada has all 13 provinces and territories and the US federal list built in. Other countries load their public holidays from a free public list the first time you choose them (needs internet once) and are then saved on your phone.

**Holidays and lieu**: see every holiday of the year, add your own, and optionally earn a lieu day automatically each time a holiday lands on one of your shifts (1 day, the hours you worked, or hours x 1.5). Any single day can be excluded with "Not this time".

**Rotation**: every week is visible and paintable at once (no more one row at a time), a narrow weeks wheel, and the week can start on any of the seven days.

**Bank edit**: compact, with a live preview of what the bank will show as you type.

**Who can take my shift?**: tap one of your shifts, then this button. It checks the calendars colleagues shared with you and lists who is off, who would have a short rest, and who is already working, with one-tap buttons to ask for a swap in exchange.

## Good to know
- Other countries' holiday lists come from the free Nager.Date service. Always check them against your employer's list.
- The provincial holiday rules for Canada are calculated from the usual rules. Check them against your employer's list.
- Someone on vacation looks "off" to colleagues, because only worked shifts are shared. The screen says to ask first.
