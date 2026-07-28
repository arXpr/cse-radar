# CSE'28 Placement Radar — Setup Guide

## Architecture

```
placement-tracker/
├── index.html              ← Single-page app entry point
├── css/
│   └── style.css           ← AMOLED dark theme
├── js/
│   ├── firebase-config.js  ← YOUR Firebase credentials go here
│   └── app.js              ← All app logic (router, CRUD, UI)
├── data/
│   └── students.js         ← Full CSE 2024-2028 batch (124 students)
└── SETUP.md                ← This file
```

## Data Flow

```
Firebase Firestore
  └── companies (collection)
        └── {companyId} (document)
              ├── name: "Goldman Sachs"
              ├── sector: "FinTech"
              ├── logo: "https://..."
              ├── cgpaCutoff: 7.5
              ├── branches: ["CSE", "ECE"]
              ├── eligibleCount: 18
              └── rounds: [
                    { name: "OA",       students: ["BT24CSE123", "BT24CSE051", ...] },
                    { name: "Round 1",  students: ["BT24CSE123", ...] },
                    { name: "Final HR", students: ["BT24CSE123"] }
                  ]
```

## Step 1 — Firebase Setup

1. Go to https://console.firebase.google.com
2. **Create Project** → name it (e.g. "cse28-radar")
3. **Add Web App** → copy the `firebaseConfig` object
4. Paste it into `js/firebase-config.js`
5. Also update `ADMIN_EMAILS` with your email

## Step 2 — Enable Firebase Services

### Authentication
- Firebase Console → Authentication → Get Started
- Enable **Email/Password** provider
- Create your admin account:
  - Authentication → Users → Add User
  - Email: your email (must match `ADMIN_EMAILS` in firebase-config.js)
  - Password: something strong

### Firestore Database
- Firebase Console → Firestore Database → Create Database
- Start in **Production mode**
- Choose region: `asia-south1` (Mumbai) for low latency

## Step 3 — Firestore Security Rules

In Firebase Console → Firestore → Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read companies
    match /companies/{companyId} {
      allow read: if true;
      // Only authenticated users can write (app checks admin email on top)
      allow write: if request.auth != null;
    }
  }
}
```

## Step 4 — Deploy to GitHub Pages

```bash
# 1. Create a new GitHub repo (e.g. cse28-radar)
# 2. Push all files to main branch
git init
git add .
git commit -m "initial: CSE'28 placement radar"
git remote add origin https://github.com/YOUR_USERNAME/cse28-radar.git
git push -u origin main

# 3. In GitHub repo settings:
#    Settings → Pages → Source: main branch / root folder
#    Save → site is live at https://YOUR_USERNAME.github.io/cse28-radar
```

## Step 5 — Adding a Company (Admin Workflow)

1. Open the site → click **Admin Login**
2. Login with your Firebase admin email
3. Go to **Companies** tab → click **+ Add Company**
4. Fill in:
   - Company name, sector, logo URL (optional)
   - CGPA cutoff for CSE
   - Eligible branches (comma separated)
   - Round names (e.g. "OA, Round 1, Round 2, HR")
5. Save → company appears immediately

## Step 6 — Adding Students to Rounds

1. Click any company → goes to detail page
2. Click **Edit Rounds** to update eligible count
3. Per round, click **Edit Students** button
4. A searchable list of all 124 CSE students appears
5. Select students who cleared that round → Save
6. Funnel diagram updates live

## Adding Non-CSE Students

For companies where other branches also cleared, you can manually add them to `data/students.js`:

```js
// Example: adding an ECE student who appeared in company timeline
{ rank: null, enroll: "BT24ECE132", name: "NIDHI YASHWANTRAO SONI", cgpa: null, branch: "ECE" },
```

The round student selector will pick them up automatically.

## Goldman Sachs Example Data

Based on the images you shared (4 students got "CS" status):
- Avantika Borkar (BT24CSE058) — CS
- Neha Sathish Nair (BT24CSE063) — CS
- Laksh Sunil Kachure (BT24CSE051) — CS
- Patlolla Bhavani Prasad (BT24CSE060) — CS

When adding Goldman Sachs:
- Rounds: OA → Shortlisted
- Eligible students: the 18 from the registration sheet
- OA Cleared: track based on your group data
- Final: the 4 above

## Updating for New Companies

Every new company = just click "+ Add Company". All 124 CSE students are always available in the student selector. Zero code changes needed.
