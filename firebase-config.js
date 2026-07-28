// ═══════════════════════════════════════════════════
// FIREBASE CONFIGURATION
// Replace with your own Firebase project config.
// Steps:
//   1. Go to https://console.firebase.google.com
//   2. Create project → Add web app
//   3. Copy the firebaseConfig object below
//   4. Enable Authentication → Email/Password
//   5. Enable Firestore Database
//   6. Set Firestore rules (see SETUP.md)
// ═══════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyASwKMdpU0bDlQxfIFLcjG1JlnS_TfpoAA",
  authDomain: "cse-radar-8d787.firebaseapp.com",
  projectId: "cse-radar-8d787",
  storageBucket: "cse-radar-8d787.firebasestorage.app",
  messagingSenderId: "260532979481",
  appId: "1:260532979481:web:76b82f34e31c4be858a788"
};

// Initialize Firebase
const app  = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ── ADMIN EMAIL(S) ──────────────────────────────────
// Add the email(s) that should have admin access.
// These users can add/edit/delete companies.
const ADMIN_EMAILS = [
  "aryapratikunofficial@gmail.com",   // ← replace with your actual email
  "aryapratikofficial@gmail.com"  // add more admins here
];

function isAdmin(user) {
  return user && ADMIN_EMAILS.includes(user.email);
}
