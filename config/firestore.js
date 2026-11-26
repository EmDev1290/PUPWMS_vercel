/**
 * Cloud Firestore Initialization and Client Module
 * PUP PQ-Scheduler
 * 
 * Auto-detects Google Cloud Application Default Credentials (ADC)
 * when running in Firebase Cloud Functions / Cloud Run.
 * Supports serviceAccountKey.json for local development.
 */
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const defaultKeyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || (fs.existsSync(defaultKeyPath) ? defaultKeyPath : null);

if (getApps().length === 0) {
    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        try {
            const serviceAccount = require(serviceAccountPath);
            initializeApp({
                credential: cert(serviceAccount),
                projectId: serviceAccount.project_id || 'pup-pq-scheduler-be242'
            });
            console.log('✅ Firebase Admin initialized with service account key.');
        } catch (e) {
            console.warn('⚠️ Could not load service account key, falling back to default credentials:', e.message);
            initializeApp({ projectId: 'pup-pq-scheduler-be242' });
        }
    } else {
        // Uses default Google Application Credentials in Cloud Functions / Cloud Run
        initializeApp({ projectId: 'pup-pq-scheduler-be242' });
    }
}

const db = getFirestore();

// Helper to clean document IDs for Firestore
function sanitizeDocId(id) {
    return String(id || '').trim().replace(/[\/\s#?]+/g, '_');
}

module.exports = {
    db,
    sanitizeDocId
};
