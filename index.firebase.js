/**
 * PUP PQ Scheduler - Firebase Cloud Functions Entry Point (2nd Gen)
 * 
 * Wraps the Express application (server.js) to run as an auto-scaling
 * HTTPS Cloud Function behind Firebase Hosting.
 */
const { onRequest } = require('firebase-functions/v2/https');
const app = require('./server');

// Export Express app as a Firebase 2nd Gen Function named 'api'
exports.api = onRequest({
    // Singapore (asia-southeast1) is closest to Philippines / PUP Campus
    // Change to 'us-central1' if staying on Firebase's standard default region
    region: process.env.FIREBASE_REGION || 'asia-southeast1',
    memory: '512MiB',
    timeoutSeconds: 120,
    minInstances: 0,
    maxInstances: 10,
    cors: true
}, app);
