import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { Platform } from 'react-native'

const firebaseConfig = {
  apiKey: Platform.OS === 'ios' 
    ? 'AIzaSyCYUs78dMbvbVPFkRD-aIqmquqaOK4iJ3Y' 
    : 'AIzaSyA55COcMBM0q_agb3TgeTK3N6Dg0fuMonY',
  authDomain: 'karmayog-task.firebaseapp.com',
  projectId: 'karmayog-task',
  storageBucket: 'karmayog-task.firebasestorage.app',
  messagingSenderId: '242622641703',
  appId: Platform.OS === 'ios' 
    ? '1:242622641703:ios:5887d038c4850421430002' 
    : '1:242622641703:android:429a83e33740e8fd430002'
}

let app
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
  console.log('🔥 Firebase Client initialized successfully on mobile')
} else {
  app = getApps()[0]
}

export const firestore = getFirestore(app)
