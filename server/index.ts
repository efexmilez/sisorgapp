/**
 * SIS Club Org - Express Server
 * Main entry point for the backend API
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import crypto from 'crypto'

// Import routes
import authRoutes from './routes/auth'
import kycRoutes from './routes/kyc'
import metaRoutes from './routes/meta'
import contributionsRoutes from './routes/contributions'
import loansRoutes from './routes/loans'
import adminRoutes from './routes/admin'
import webhookRoutes from './routes/webhook'
import userRoutes from './routes/user'

// Import jobs
import { scheduleContributionReminders } from './jobs'

const app = express()
const PORT = process.env.PORT || 4000

// Request logging
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`)
  })
  next()
})

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://sisclub.ng'
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5139', 'http://127.0.0.1:5139'],
  credentials: true,
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
})
app.use('/api/', limiter)

// Webhook route needs raw body - must be before JSON middleware
app.use('/api/webhook/paystack', express.raw({ type: 'application/json' }))

// JSON parsing for other routes
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Mount routes
app.use('/api/auth', authRoutes)
app.use('/api/kyc', kycRoutes)
app.use('/api/meta', metaRoutes)
app.use('/api/contributions', contributionsRoutes)
app.use('/api/loans', loansRoutes)
app.use('/api/user', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/webhook', webhookRoutes)

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error Handler] Server error:', err)
  
  // Multer file size error
  if (err.message?.includes('File too large')) {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' })
  }
  
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 SIS Club Org API running on http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/api/health`)
  console.log(`\n   Routes:`)
  console.log(`   - Auth: /api/auth/*`)
  console.log(`   - KYC: /api/kyc/*`)
  console.log(`   - Contributions: /api/contributions/*`)
  console.log(`   - Loans: /api/loans/*`)
  console.log(`   - Admin: /api/admin/*`)
  console.log(`   - Webhooks: /api/webhook/*`)
  console.log(`   - Meta: /api/meta/*\n`)
  
  // Schedule cron jobs
  scheduleContributionReminders()
})

export default app
