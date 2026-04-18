'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

interface User {
  id: string
  full_name: string
  email: string
  phone: string
  role: 'member' | 'admin'
  kyc_status: 'pending' | 'approved' | 'rejected'
  state: string
  lga: string
  street_address?: string
  area?: string
  bank_account_number?: string
  bank_code?: string
  bank_name?: string
  bvn?: string
  national_id_url?: string
  utility_bill_url?: string
  kyc_rejection_reason?: string
  created_at?: any
}

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<{ requiresVerification: boolean; message?: string }>
  logout: () => Promise<void>
  googleLogin: () => Promise<void>
  refreshUserData: () => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
}

interface RegisterData {
  full_name: string
  email: string
  password: string
  phone: string
  state: string
  lga: string
  street_address: string
  area?: string
  bank_account_number?: string
  bank_code?: string
  bank_name?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserFromFirestore = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User
      }
    } catch (err) {
      console.error('Error fetching user from Firestore:', err)
    }
    return null
  }

  const createUserInFirestore = async (uid: string, data: RegisterData) => {
    try {
      const userData = {
        full_name: data.full_name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        state: data.state || 'Lagos',
        lga: data.lga || 'Lagos',
        street_address: data.street_address || '',
        area: data.area || '',
        bank_account_number: data.bank_account_number || '',
        bank_code: data.bank_code || '',
        bank_name: data.bank_name || '',
        role: 'member',
        kyc_status: 'pending',
        created_at: serverTimestamp(),
      }
      
      await setDoc(doc(db, 'users', uid), userData)
      return { id: uid, ...userData } as User
    } catch (err) {
      console.error('Error creating user in Firestore:', err)
      throw err
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken()
          setAccessToken(token)
        } catch {
          setAccessToken(null)
        }
        
        const dbUser = await fetchUserFromFirestore(fbUser.uid)
        if (dbUser) {
          setUser(dbUser)
        } else {
          // Firebase Auth succeeded but no Firestore profile yet —
          // set a minimal user so protected pages don't redirect to /login
          setUser({
            id: fbUser.uid,
            full_name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Member',
            email: fbUser.email || '',
            phone: '',
            role: 'member',
            kyc_status: 'pending',
            state: '',
            lga: '',
          })
        }
      } else {
        setUser(null)
        setAccessToken(null)
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      setFirebaseUser(result.user)
      
      const token = await result.user.getIdToken()
      setAccessToken(token)
      
      const dbUser = await fetchUserFromFirestore(result.user.uid)
      if (dbUser) {
        setUser(dbUser)
      } else {
        setUser({
          id: result.user.uid,
          full_name: result.user.displayName || result.user.email?.split('@')[0] || 'Member',
          email: result.user.email || '',
          phone: '',
          role: 'member',
          kyc_status: 'pending',
          state: '',
          lga: '',
        })
      }
    } catch (err: any) {
      console.error('Firebase login error:', err)
      throw new Error(getFirebaseErrorMessage(err.code))
    }
  }

  const register = async (data: RegisterData): Promise<{ requiresVerification: boolean; message?: string }> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, data.email, data.password)
      setFirebaseUser(result.user)

      await updateProfile(result.user, { displayName: data.full_name })

      await createUserInFirestore(result.user.uid, data)

      await sendEmailVerification(result.user)

      await firebaseSignOut(auth)
      setUser(null)
      setFirebaseUser(null)
      setAccessToken(null)

      return { 
        requiresVerification: true, 
        message: 'Account created! Please check your email to verify your account before logging in.' 
      }
    } catch (err: any) {
      console.error('Firebase register error:', err)
      throw new Error(getFirebaseErrorMessage(err.code))
    }
  }

  const logout = async () => {
    try {
      await firebaseSignOut(auth)
      setUser(null)
      setFirebaseUser(null)
      setAccessToken(null)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const googleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      setFirebaseUser(result.user)
      
      const token = await result.user.getIdToken()
      setAccessToken(token)
      
      const dbUser = await fetchUserFromFirestore(result.user.uid)
      if (dbUser) {
        setUser(dbUser)
      } else {
        // Create new user if not exists
        const newUser: User = {
          id: result.user.uid,
          full_name: result.user.displayName || result.user.email?.split('@')[0] || 'Member',
          email: result.user.email || '',
          phone: '',
          role: 'member',
          kyc_status: 'pending',
          state: 'Lagos',
          lga: 'Lagos',
          created_at: serverTimestamp(),
        }
        await setDoc(doc(db, 'users', result.user.uid), newUser)
        setUser(newUser)
      }
    } catch (err: any) {
      console.error('Google login error:', err)
      throw new Error(getFirebaseErrorMessage(err.code || ''))
    }
  }

  const refreshUserData = async () => {
    if (firebaseUser) {
      const dbUser = await fetchUserFromFirestore(firebaseUser.uid)
      if (dbUser) {
        setUser(dbUser)
      }
    }
  }

  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!firebaseUser || !firebaseUser.email) throw new Error('User not authenticated')
    
    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(firebaseUser.email, oldPassword)
      await reauthenticateWithCredential(firebaseUser, credential)
      
      // Then update password
      await updatePassword(firebaseUser, newPassword)
    } catch (err: any) {
      console.error('Change password error:', err)
      throw new Error(getFirebaseErrorMessage(err.code || ''))
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser, 
      accessToken, 
      isLoading, 
      login, 
      register, 
      logout, 
      googleLogin, 
      refreshUserData,
      changePassword
    }}>
      {children}
    </AuthContext.Provider>
  )
}

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login instead.'
    case 'auth/invalid-email':
      return 'Invalid email address.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.'
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.'
    default:
      return 'Authentication failed. Please try again.'
  }
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
