/**
 * KYC Routes — Cloudinary uploads + Firestore
 * POST /kyc/upload     – upload national_id or utility_bill
 * POST /kyc/verify-bvn – BVN verification (mock)
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
import { authMiddleware } from '../middleware/auth'
import '../lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

const router = Router()
const db = getFirestore()

// ── Cloudinary config ────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ── Multer — memory storage ──────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Only JPEG, PNG, WEBP or PDF files are allowed'))
  },
})

// ── Helper: upload buffer to Cloudinary ─────────────────────────────────────
async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId: string,
  resourceType: 'image' | 'raw' = 'image',
  mimeType: string = 'image/png'
): Promise<{ secure_url: string; public_id: string }> {
  const timeoutMs = 60000;
  
  const uploadPromise = new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    cloudinary.uploader.upload(
      `data:${mimeType};base64,${buffer.toString('base64')}`,
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: true,
        timeout: timeoutMs,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Upload failed'))
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id })
      }
    )
  })

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Upload timed out after 60 seconds')), timeoutMs)
  })

  return Promise.race([uploadPromise, timeoutPromise])
}

// ── POST /kyc/upload ─────────────────────────────────────────────────────────
const uploadSchema = z.object({
  doc_type: z.enum(['national_id', 'utility_bill']),
})

router.post(
  '/upload',
  authMiddleware,
  upload.single('document'),
  async (req: Request, res: Response) => {
    try {
      const body = uploadSchema.parse(req.body)
      const file = req.file

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const userId = req.user!.userId
      const timestamp = Date.now()
      const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image'
      const folder = `kyc/${userId}`
      const publicId = `${body.doc_type}_${timestamp}`

      // Upload to Cloudinary
      const { secure_url } = await uploadToCloudinary(file.buffer, folder, publicId, resourceType, file.mimetype)

      // Determine which Firestore field to update
      const fieldMap: Record<string, string> = {
        national_id: 'national_id_url',
        utility_bill: 'utility_bill_url',
      }

      const updateData: Record<string, string> = {
        [fieldMap[body.doc_type]]: secure_url,
        kyc_status: 'pending',
      }

      // Use set with merge to create document if it doesn't exist
      await db.collection('users').doc(userId).set(updateData, { merge: true })

      res.json({
        message: `${body.doc_type === 'national_id' ? 'National ID' : 'Utility Bill'} uploaded successfully. Verification in progress.`,
        url: secure_url,
        kyc_status: 'pending',
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message })
      }
      console.error('KYC upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      res.status(500).json({ error: 'Failed to upload document', details: errorMessage })
    }
  }
)

// ── POST /kyc/verify-bvn ─────────────────────────────────────────────────────
router.post('/verify-bvn', authMiddleware, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      bvn: z.string().regex(/^\d{11}$/, 'BVN must be 11 digits'),
    })
    const body = schema.parse(req.body)

    // TODO: Integrate with Paystack Identity API
    // For now, return mock response
    const isValid = body.bvn === '12345678901' || body.bvn === '22222222222'

    if (isValid) {
      res.json({ verified: true, account_name: 'VERIFIED USER' })
    } else {
      res.json({ verified: false, account_name: null })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message })
    }
    console.error('BVN verify error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
