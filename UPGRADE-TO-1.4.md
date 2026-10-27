# Upgrade from v1.0 to v1.4 (GitHub + Firebase)

Your data is safe. Nothing in your account is deleted. Old vacation and sick numbers turn into the new "banks" the first time you open v1.4.

You do two things: **1. update the Firebase rules**, **2. replace the files on GitHub**. Do the rules first (5 minutes), then GitHub (10 minutes).

---

## Step 1: Firebase rules (needed for sharing, swaps and the bell)

1. Go to **console.firebase.google.com** and open your project (`shift-calendar`).
2. Left menu: **Build > Firestore Database**, then the **Rules** tab.
3. Select everything in the box and delete it.
4. Open **`firestore.rules`** from this package in any text editor, copy everything, paste it into the box.
5. Click **Publish**. Wait until it says published.

Nothing else changes in Firebase. No new service to turn on, nothing to pay for. (Sharing and swaps need no Cloud Functions, so you stay on the free Spark plan.)

## Step 2: Replace the files on GitHub

You keep your own `firebase-config.js`. **Do not upload the one from this package over it** (or upload it only if yours is lost: it already has your values).

1. Go to **github.com**, open your repository **Shift-Tracker**.
2. Click **Add file > Upload files**.
3. Drag in these files from the package (all at the top level, no folders):
   `index.html` `style.css` `app.js` `core.js` `engine.js` `banks.js` `share.js` `backend.js`
   `views-cal.js` `views-leave.js` `views-rot.js` `views-settings.js` `views-social.js`
   `holidays.js` `sw.js` `manifest.webmanifest`
   (The icons and `firebase-config.js` do not change.)
4. Scroll down and click **Commit changes**.
5. Wait about 1 to 2 minutes for GitHub Pages to rebuild. You can watch **Actions** at the top of the repo until the green tick appears.

Optional: the `tests` folder, `firestore.rules` and the guides are not needed on GitHub.

## Step 3: Get the new version on your phone

The old version is saved on the phone for offline use, so it can take one extra step:

1. Open the app and **close it completely** (swipe it away), then open it again. Do this twice.
2. If it still looks old: Chrome menu (three dots) > **Settings > Privacy > Clear browsing data**, tick **Cached images and files** only, clear. Open the app again.
3. Settings (bottom right) shows **version 1.4** at the very bottom when you have the new one.

If you installed the app to your home screen and it will not update, remove it and install it again from the Chrome menu. Your data stays in your account.

---

## What is new

- **Leave banks:** Vacation, Sick, Banked overtime, Lieu, plus your own. Each counts in hours or days. The big number is **available to book** (balance today minus time you already booked).
- **Vacation switches:** for each bank you can switch on or off "a little each pay day" and "the whole year added at once on a date". Optional "lose unused time on that date". Open Leave > a bank > Edit bank.
- **Week start** (Sunday, Monday or Saturday) and rotations of **1 to 52 weeks** with a rolling wheel.
- **Rollers** instead of drop-downs in Settings. **Swipe** the calendar left or right to change month.
- **One-screen calendar** on tall phones, scrolling on small phones, two panes on tablets and unfolded phones. Change it in Settings > Screen layout.
- **Better calendar export:** pick a range, several reminders, same events update instead of duplicating, and a list of what changed since last time.
- **Share a view-only calendar:** colleagues see only the shifts you work. Vacation, sick and the rest show as Off. Pause, resume or remove anyone, and choose who may send swap requests.
- **Swap requests:** a colleague asks to swap one of their shifts for one of yours. You approve, decline, or suggest another date. Both calendars update.
- **Bell with a red number:** new requests show the next time you open the app. (No push messages: those need a paid service.)

## Test it in 10 minutes (you need a second person, or a second Google account)

1. **Rules check.** Open the app, Settings > **Share my calendar** > **Create an invite link**. If it says "Not saved: publish the Firestore rules", redo Step 1.
2. **Invite.** Tap **Send link** and send it to yourself or a friend. The other person opens it, signs in, taps **Accept**.
3. **Privacy check.** On the friend's phone open your calendar. Mark one of your days as Sick. After a few seconds it must show **Off** on their screen, never "Sick".
4. **Swap.** On your phone turn on **Can send swap requests** for them. On their phone tap a day you work > **Ask to swap**. On your phone open the bell, open the request, **Approve**. Open the app on both phones: both calendars show the swap.
5. **Pause.** On your phone turn off **Can view**. Their screen should say access was paused.

## Firebase Rules Playground (optional extra check)

In Firebase > Firestore > Rules > **Rules playground**:
- Simulate a **get** on `/shared/YOUR_UID` signed in as a different (random) user id: it must be **denied**.
- Simulate a **get** on `/users/YOUR_UID/days/2026-11-02` as a different user: **denied**.

## If something goes wrong

- **Blank or "could not start" page:** a file is missing on GitHub. All 13 `.js` files above must be at the top level. Hard refresh (Ctrl+F5 on a computer).
- **"Sharing needs the new Firestore rules":** Step 1 was not published.
- **Go back to v1.0:** upload the old v1.0 files again. Your data keeps working (v1.0 ignores the new fields).
