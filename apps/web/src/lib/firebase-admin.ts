import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

let app: any = null
if (getApps().length === 0) {
  if (serviceAccountKey) {
    try {
      const parsedKey = JSON.parse(serviceAccountKey)
      app = initializeApp({
        credential: cert(parsedKey)
      })
      console.log('✅ Firebase Admin initialized successfully')
    } catch (e) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e)
    }
  } else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not defined')
  }
} else {
  app = getApps()[0]
}

const firestore = app ? getFirestore(app) : null

export { firestore }

export interface AppConfig {
  minAndroidVersion: string
  minIosVersion: string
  androidUrl: string
  iosUrl: string
  maintenanceMode: boolean
}

/**
 * Syncs the application version and maintenance settings to Firebase Firestore
 */
export async function syncAppConfigToFirestore(config: AppConfig): Promise<boolean> {
  if (!firestore) {
    console.warn('⚠️ Firestore is not initialized. Cannot sync config to Firestore.')
    return false
  }

  try {
    const docRef = firestore.collection('app_config').doc('maintenance')
    await docRef.set({
      minAndroidVersion: config.minAndroidVersion,
      minIosVersion: config.minIosVersion,
      androidUrl: config.androidUrl,
      iosUrl: config.iosUrl,
      maintenanceMode: config.maintenanceMode,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true })
    console.log('✅ Successfully synced configuration to Firestore app_config/maintenance')
    return true
  } catch (error) {
    console.error('❌ Failed to sync config to Firestore:', error)
    return false
  }
}
