const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;
let bucket = null;
let isFirebaseEnabled = false;

// Check for Firebase service account file or env variables
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || path.join(__dirname, '..', 'firebase-service-account.json');

try {
  if (process.env.FIREBASE_CONFIG_JSON) {
    const config = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
    if (config.private_key) {
      config.private_key = config.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(config),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${config.project_id}.appspot.com`
    });
    db = admin.firestore();
    bucket = admin.storage().bucket();
    isFirebaseEnabled = true;
    console.log('Firebase initialized successfully from environment variable.');
  } else if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
    });
    db = admin.firestore();
    bucket = admin.storage().bucket();
    isFirebaseEnabled = true;
    console.log(`Firebase initialized successfully from file: ${serviceAccountPath}`);
  } else {
    console.warn('Firebase configuration missing (no FIREBASE_CONFIG_JSON env or firebase-service-account.json found). Falling back to local database mode.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK. Falling back to local database mode. Error:', error.message);
}

module.exports = {
  db,
  bucket,
  isFirebaseEnabled
};
