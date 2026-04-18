/**
 * User Profile Routes
 * Endpoints for users to update their own profile
 */

import { Router, Request, Response } from 'express'
import '../lib/firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { authMiddleware } from '../middleware/auth'
import { z } from 'zod'
import { encryptField } from '../utils/encrypt'

const router = Router()
const db = getFirestore()

const updateProfileSchema = z.object({
  phone: z.string().optional(),
  street_address: z.string().optional(),
  area: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_name: z.string().optional(),
  bvn: z.string().optional(),
})

router.use(authMiddleware)

// PATCH /user/profile - Update own profile
router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const body = updateProfileSchema.parse(req.body)

    const updates: Record<string, any> = {}
    for (const [key, val] of Object.entries(body)) {
      if (val !== undefined) {
        updates[key] = val
        // If BVN is updated, also update encrypted version for admin/security
        if (key === 'bvn' && val) {
          try {
            updates['bvn_encrypted'] = encryptField(val)
          } catch (err) {
            console.warn('BVN encryption failed during profile update:', err)
          }
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    await db.collection('users').doc(userId).update(updates)

    res.json({ message: 'Profile updated', updated_fields: Object.keys(updates) })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message })
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /user/profile - Get own profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const userDoc = await db.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userData = userDoc.data()
    res.json({
      id: userDoc.id,
      full_name: userData?.full_name,
      email: userData?.email,
      phone: userData?.phone,
      state: userData?.state,
      lga: userData?.lga,
      street_address: userData?.street_address,
      area: userData?.area,
      bank_account_number: userData?.bank_account_number,
      bank_name: userData?.bank_name,
      bvn: userData?.bvn,
      kyc_status: userData?.kyc_status,
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router