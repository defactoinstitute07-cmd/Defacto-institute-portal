const admin = require('firebase-admin');
const path = require('path');

let firebaseApp;

const decodePrivateKeyFromBase64 = (value) => {
    try {
        return Buffer.from(String(value || ''), 'base64').toString('utf8');
    } catch (error) {
        console.error('[Firebase] Failed to decode FIREBASE_PRIVATE_KEY_BASE64');
        return '';
    }
};

const getServiceAccountFromEnv = () => {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY_BASE64
        ? decodePrivateKeyFromBase64(process.env.FIREBASE_PRIVATE_KEY_BASE64)
        : process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKeyRaw) {
        return null;
    }

    // Support private keys stored with escaped newlines in .env files.
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    return {
        projectId,
        clientEmail,
        privateKey
    };
};

try {
    // Try to load service account from structured environment variables first
    const serviceAccountFromEnv = getServiceAccountFromEnv();
    if (serviceAccountFromEnv) {
        if (admin.apps.length > 0) {
            firebaseApp = admin.app();
        } else {
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccountFromEnv)
            });
        }
    }
    // Backward compatibility: single JSON env variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        if (admin.apps.length > 0) {
            firebaseApp = admin.app();
        } else {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } else if (!firebaseApp) {
        // Fallback to local file
        const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
        
        // Check if file exists to avoid crash on startup if not provided yet
        const fs = require('fs');
        if (fs.existsSync(serviceAccountPath)) {
            if (admin.apps.length > 0) {
                firebaseApp = admin.app();
            } else {
                firebaseApp = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccountPath)
                });
            }
        } else {
            console.warn('[Firebase] Warning: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT env var is missing. Push notifications will be in simulation mode.');
            // Initialize with dummy if necessary or handle gracefully in services
        }
    }
} catch (error) {
    console.error('[Firebase] Initialization error');
}

const createMessagingFallback = () => {
    const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const baseError = new Error('Firebase messaging is not configured. Set FIREBASE_* env vars or FIREBASE_SERVICE_ACCOUNT.');
    baseError.code = 'messaging/configuration-error';

    const rejectInProduction = () => Promise.reject(baseError);

    if (isProduction) {
        return {
            send: rejectInProduction,
            sendEach: rejectInProduction,
            sendEachForMulticast: rejectInProduction,
            subscribeToTopic: rejectInProduction,
            unsubscribeFromTopic: rejectInProduction
        };
    }

    // Keep simulator behavior only for non-production development environments.
    return {
        send: (payload) => {
            return Promise.resolve('simulated-message-id');
        },
        sendEach: (payloads) => {
            return Promise.resolve({ successCount: payloads.length, failureCount: 0, responses: [] });
        },
        sendEachForMulticast: (payload) => {
            return Promise.resolve({ successCount: payload.tokens.length, failureCount: 0, responses: payload.tokens.map(() => ({ success: true })) });
        },
        subscribeToTopic: (tokens, topic) => {
            return Promise.resolve({ successCount: tokens.length, failureCount: 0, errors: [] });
        },
        unsubscribeFromTopic: (tokens, topic) => {
            return Promise.resolve({ successCount: tokens.length, failureCount: 0, errors: [] });
        }
    };
};

const messaging = firebaseApp ? firebaseApp.messaging() : createMessagingFallback();

module.exports = { admin, messaging };
