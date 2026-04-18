/**
 * Firebase Admin SDK initialisation
 * All backend Firebase services (Auth, Firestore, Storage) use this instance.
 *
 * Credential resolution order:
 *   1. FIREBASE_SERVICE_ACCOUNT env var — single-line JSON string
 *   2. server/service-account.json file — full service account key file
 *   3. Project ID only — token verification works, admin writes require a credential
 *
 * Get a service account key:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 */

import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'sisclub-10'
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'sisclub-10.firebasestorage.app'

function loadServiceAccount(): object | null {
  // 1. Try env var (must be valid single-line JSON)
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT
  if (envJson && envJson.trim().startsWith('{')) {
    try {
      return JSON.parse(envJson)
    } catch {
      // fall through to file
    }
  }

  // 2. Try local file
  const filePath = path.resolve(__dirname, '../service-account.json')
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch {
      // fall through
    }
  }

  return null
}

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount()

  if (serviceAccount) {
    const sa = serviceAccount as any
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id ?? PROJECT_ID,
      storageBucket: STORAGE_BUCKET,
    })
    console.log('✅ Firebase Admin initialised with service account')
  } else {
    admin.initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET })
    console.warn(
      '⚠️  Firebase Admin: no service account — token verification works, ' +
      'Firestore writes and Storage uploads require a service account.'
    )
  }
}

export default admin
