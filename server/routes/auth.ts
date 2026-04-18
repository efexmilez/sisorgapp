/**
 * Authentication Routes
 * These are now minimal since Firebase handles auth on the client
 * POST /auth/firebase-register - placeholder for server-side needs
 */

import { Router, Request, Response } from 'express'

const router = Router()

router.post('/firebase-register', async (req: Request, res: Response) => {
  try {
    const { uid, email } = req.body

    if (!uid || !email) {
      return res.status(400).json({ error: 'UID and email are required' })
    }

    // User is already created in Firestore by the client
    // This endpoint is here for any server-side processing you might need
    res.status(201).json({ message: 'User registration acknowledged', uid })
  } catch (error) {
    console.error('Firebase register error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/firebase-user', async (req: Request, res: Response) => {
  try {
    const { uid } = req.body

    if (!uid) {
      return res.status(400).json({ error: 'Firebase UID is required' })
    }

    // User data is stored in Firebase Firestore on the client
    // This endpoint is here for any server-side needs
    res.json({ user: null, message: 'User data is stored in Firebase' })
  } catch (error) {
    console.error('Firebase user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
