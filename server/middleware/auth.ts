/**
 * Authentication Middleware
 * Verifies Firebase ID tokens. Falls back to legacy custom JWTs.
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import '../lib/firebase-admin' // ensure Firebase app is initialised
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export interface AuthUser {
  userId: string
  email: string
  role: 'member' | 'admin'
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'development_secret_change_in_production'

async function getRoleFromFirestore(uid: string, email?: string): Promise<'member' | 'admin'> {
  // Fallback for primary admin email
  const ADMIN_EMAILS = ['aaronshep007@gmail.com', 'admin@sisclub.ng']
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
    return 'admin'
  }

  try {
    const doc = await getFirestore().collection('users').doc(uid).get()
    if (doc.exists) {
      const role = doc.data()?.role?.toString().toLowerCase()
      if (role === 'admin') return 'admin'
    }
  } catch (err) {
    console.error('Error fetching role from Firestore:', err)
    // Firestore unavailable — default to member
  }
  return 'member'
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header required' })
    return
  }

  const token = authHeader.slice(7)

  // ── Firebase ID token ────────────────────────────────────────────────────
  try {
    const decoded = await getAuth().verifyIdToken(token)
    const role = await getRoleFromFirestore(decoded.uid, decoded.email)
    req.user = { userId: decoded.uid, email: decoded.email ?? '', role }
    next()
    return
  } catch (firebaseErr: any) {
    if (firebaseErr?.code === 'auth/id-token-expired') {
      res.status(401).json({ error: 'Token expired' })
      return
    }
    // Not a Firebase token — try legacy JWT
  }

  // ── Legacy custom JWT fallback ───────────────────────────────────────────
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
      role: 'member' | 'admin'
    }
    req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role }
    next()
  } catch (jwtErr) {
    if (jwtErr instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' })
      return
    }
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return }
  if (req.user.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return }
  next()
}

export function generateTokens(user: { id: string; email: string; role: string }) {
  const JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'development_refresh_secret_change_in_production'
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  )
  const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  })
  return { accessToken, refreshToken }
}

export function verifyRefreshToken(token: string): string {
  const JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'development_refresh_secret_change_in_production'
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; type: string }
  if (decoded.type !== 'refresh') throw new Error('Invalid token type')
  return decoded.userId
}
