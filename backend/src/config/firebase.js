// src/config/firebase.js
// Initializes the Firebase Admin SDK using a service account JSON stored in
// the FIREBASE_SERVICE_ACCOUNT environment variable.
//
// HOW TO GET THE SERVICE ACCOUNT (completely free):
//   1. Firebase Console → Project Settings → Service Accounts
//   2. Click "Generate new private key" → download the JSON file
//   3. Minify/stringify the JSON and paste as FIREBASE_SERVICE_ACCOUNT env var
//   4. NEVER commit the JSON file itself to git

const admin = require('firebase-admin');

let firebaseAdmin;

function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT env var is not set. ' +
      'See backend/.env.example for setup instructions.'
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is not valid JSON. ' +
      'Make sure the entire service account JSON is on one line.'
    );
  }

  // Prevent re-initialization if the module is hot-reloaded in dev
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  firebaseAdmin = admin;
  return firebaseAdmin;
}

module.exports = { getFirebaseAdmin };
