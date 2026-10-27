# Shift Calendar: put it online (Firebase + GitHub Pages)

> **Already running v1.0?** Skip this guide and follow **UPGRADE-TO-1.4.md**.

**What you are setting up**

| Piece | Job | Cost |
|---|---|---|
| Firebase Authentication | Log in with Google or email and password | Free |
| Firestore (inside Firebase) | Saves each person's schedule, balances and swaps | Free tier (1 GiB, 50,000 reads and 20,000 writes per day) |
| GitHub Pages | Hosts the app files | Free |

There is nothing else to sign up for. GitHub only holds the files. Firebase does all the logging in and saving.

You will edit **one file** (`firebase-config.js`) and paste **one block of rules** into Firebase.

Time needed: about 30 minutes. Firebase and GitHub change their screens from time to time, so if a button has moved, look for the same words nearby.

---

## Part 1: Firebase

### 1. Create the project
1. Go to **console.firebase.google.com** and sign in with your Google account.
2. Click **Create a project** (or **Add project**). Name it `shift-calendar`.
3. Google Analytics: you can switch it **off**. Click **Create project**, then **Continue**.

### 2. Turn on login
1. In the left menu click **Build > Authentication**, then **Get started**.
2. On the **Sign-in method** tab:
   - Click **Email/Password**, turn on the first switch (**Enable**), click **Save**.
   - Click **Google**, turn on **Enable**, choose your email as the **Project support email**, click **Save**.

### 3. Allow your GitHub address to log in
1. Still in Authentication, open **Settings > Authorized domains**.
2. Click **Add domain** and type exactly:
   ```
   chirag130294.github.io
   ```
   Only the domain: no `https://`, no `/Shift-Tracker`.

Skip this and Google login will say "unauthorized domain".

### 4. Create the database
1. Left menu: **Build > Firestore Database**, then **Create database**.
2. Pick a location close to you, for example **northamerica-northeast2 (Toronto)** or **northamerica-northeast1 (Montreal)**. You cannot change it later.
3. Choose **Start in production mode**, then **Create**.

### 5. Paste the security rules (important)
These rules make sure every person can only read and write **their own** data.
1. In Firestore Database open the **Rules** tab.
2. Delete everything in the box, then paste the full contents of the file **`firestore.rules`** from this package.
3. Click **Publish**.

### 6. Get your app settings
1. Click the **gear icon** next to Project Overview, then **Project settings**.
2. On the **General** tab, scroll to **Your apps** and click the **web icon `</>`**.
3. App nickname: `shift-calendar`. Leave **Firebase Hosting** unticked. Click **Register app**.
4. You will see a block that looks like this. Keep this page open:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "shift-calendar-xxxxx.firebaseapp.com",
     projectId: "shift-calendar-xxxxx",
     storageBucket: "shift-calendar-xxxxx.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef"
   };
   ```
   These values are safe to be public. The rules from step 5 are what protect the data.

---

## Part 2: Edit one file

Open **`firebase-config.js`** (right-click, **Open with**, Notepad or VS Code) and replace each `PASTE_...` value with the matching value from Firebase. Keep the quotation marks and the commas.

```js
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "shift-calendar-xxxxx.firebaseapp.com",
  projectId: "shift-calendar-xxxxx",
  storageBucket: "shift-calendar-xxxxx.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
```

Do not change any other file. Save it.

---

## Part 3: Put the files on GitHub

You already have the repository `Shift-Tracker` and GitHub Pages turned on. This replaces the old Supabase page.

1. Unzip `shift-calendar-firebase.zip` on your computer.
2. Open `https://github.com/chirag130294/Shift-Tracker`.
3. Click **Add file > Upload files**.
4. Open the unzipped folder and drag **all the files inside it** (not the zip, and not the folder itself) into the browser window. The `tests` folder is optional.

   Files that must be there, at the top level of the repo:
   `index.html`, `style.css`, `app.js`, `engine.js`, `holidays.js`, `backend.js`, `firebase-config.js`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `icon-maskable.png`
5. Scroll down and click **Commit changes**. Uploading a file with the same name replaces the old one.
6. Check **Settings > Pages**: Source is **Deploy from a branch**, branch **main**, folder **/ (root)**.
7. Wait 1 to 2 minutes, then open:
   ```
   https://chirag130294.github.io/Shift-Tracker/
   ```
   Press **Ctrl+F5** the first time so you do not see the old page.

**To change `firebase-config.js` later:** open it in the repo, click the **pencil icon**, edit, then **Commit changes**.

---

## Part 4: Test it (10 minutes)

- [ ] The **Log in** screen appears (not "Almost there").
- [ ] **Create an account** with email and password, or use **Continue with Google**.
- [ ] The 4-step setup opens. Paint your rotation, enter a pay date and your balances.
- [ ] The calendar shows your shifts. Check **three dates** against your real schedule, including a night shift.
- [ ] Tap a day, book **Vacation**. The balance on the calendar goes down.
- [ ] Close the app, reopen it: everything is still there.
- [ ] Log in on a second device or browser: the same data appears.
- [ ] In Firebase **Firestore Database > Data**, you can see `users/<id>` with your data.
- [ ] Turn on airplane mode, open the app, change a note: it still works and syncs when you are back online.
- [ ] Create a second account: it cannot see the first account's data.

**Quick preview without Firebase:** add `?demo=1` to the address (`.../Shift-Tracker/?demo=1`) to try the app with sample data. Nothing is saved in preview.

---

## Part 5: Install it on your Android phone

1. Open `https://chirag130294.github.io/Shift-Tracker/` in **Chrome** on your phone.
2. Log in.
3. Tap the **three dots menu**, then **Install app** (or **Add to Home screen**). You can also use **Install on this phone** in the app's Settings tab.
4. Open it from the new icon. It runs full screen like any other app.

No Google Play account, no developer mode and no fees are needed. It updates itself: after you upload new files to GitHub, close and reopen the app (twice if it still looks old).

On iPhone: open it in **Safari**, tap **Share**, then **Add to Home Screen**.

---

## Reminders

The web version cannot send alerts while it is closed. Instead, in **Settings > Calendar export and reminders** choose how long before each shift you want a reminder, then tap **Download calendar file (.ics)**. Open the file on your phone and add it to Google Calendar. It adds your next 12 months of shifts and booked time off, with reminders. Download it again after a schedule change.

---

## Troubleshooting

| What you see | Fix |
|---|---|
| "Almost there" screen | `firebase-config.js` still has `PASTE_...` values, or the new version has not been uploaded yet. Check the commit, wait a minute, press Ctrl+F5. |
| "Could not load Firebase" | No internet on first load, or a typo in `firebase-config.js` (missing quote or comma). |
| Google login says unauthorized domain | Part 1 step 3: add `chirag130294.github.io` as an authorized domain. |
| "This sign-in method is not turned on" | Part 1 step 2: enable Email/Password and Google. |
| Google window is blocked | Allow pop-ups for the site, or use email and password. |
| "Cannot load your data" or "Not saved: publish the Firestore rules" | Part 1 step 4 and 5: create the database, then paste the rules and click **Publish**. |
| Logged in but setup starts again on a new phone | Wait a few seconds for it to reach the server. If it persists, check the rules were published. |
| Wrong shifts on some days | In **Settings > Rotation**, check which date Week 1 starts. Pick any date inside Week 1. |
| Old screens after an update | Close the app fully and reopen it, or press Ctrl+F5 in the browser. |
| "Delete my account" asks you to log in again | Firebase requires a recent login for this. Log out, log in, try again. |

---

## What is in the app

Calendar with your repeating rotation (1 to 6 weeks, or a day cycle such as 2-2-3), your own shift types (default AM, PM, D, E, N), nights shown on the date they start, statutory holidays for Canada (Ontario, BC, Alberta, federal list) and the US, your own extra holidays, pay days (weekly, every 2 weeks, twice a month, monthly), vacation and sick balances with earning per pay period, lieu days, use-it-or-lose-it warning, vacation, sick and time-off booking by date range, shift swaps, extra shifts and overtime, a long weekend finder, a calendar file export, offline use, light and dark mode.

## Things to know

- **Holidays:** calculated from rules and listed per province. Always check them against your employer's list and use **Add holiday** in Settings for anything missing.
- **Balances** count from the day you save them. Time you book after that is subtracted automatically, and earning per pay period is added on each pay day.
- **Reminders** come from your calendar app after you import the `.ics` file (see above).
- **Passwords** are handled by Firebase. The app never sees or stores them.
- **Free limits:** Firestore's free tier is more than enough for a personal or small-team app. If you ever share the app widely, check Firebase's usage page.
- **Optional extra security:** in Google Cloud console, **APIs and Services > Credentials**, open the browser key and restrict it to the website `chirag130294.github.io/*`.
- **Your old Supabase accounts** are separate. They are not moved to Firebase, so create a new account here.
- **Not tested here:** I tested the schedule logic and every screen in a browser with sample data. I could not connect to a live Firebase project from my environment, so Part 4 is the real test of login and saving.
