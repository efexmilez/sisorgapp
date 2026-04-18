import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyAdZkLTiktR32PzYakY5fXwFcB5R7cFn94",
  authDomain: "sisclub-10.firebaseapp.com",
  projectId: "sisclub-10",
  storageBucket: "sisclub-10.firebasestorage.app",
  messagingSenderId: "141420954491",
  appId: "1:141420954491:web:83e1df96a69d2243f273de",
  measurementId: "G-SZ22BR00TJ"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
