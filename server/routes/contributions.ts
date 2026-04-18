/**
 * Contributions Routes — Firebase Firestore
 * GET  /contributions/balance
 * GET  /contributions/history
 * GET  /contributions/dva
 * POST /contributions/initiate
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import '../lib/firebase-admin'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { formatNaira } from '../utils/formatNaira'
import {
  getContributionBalance,
  getContributionHistory,
  createPendingContribution,
} from '../services/contributionService'

const router = Router()
const db = getFirestore()

router.use(authMiddleware)

const LOAN_FACTOR = parseFloat(process.env.LOAN_FACTOR || '0.2')
const MINIMUM_CONTRIBUTION_KOBO = parseInt(process.env.MONTHLY_AMOUNT_KOBO || '500000', 10)

/**
 * POST /contributions/initiate
 */
router.post('/initiate', async (req: Request, res: Response) => {
  try {
    const { amount_kobo } = z
      .object({ amount_kobo: z.number().int().positive() })
      .parse(req.body)

    if (amount_kobo < MINIMUM_CONTRIBUTION_KOBO) {
      return res.status(400).json({ error: `Minimum contribution is ${formatNaira(MINIMUM_CONTRIBUTION_KOBO)}` })
    }

    const userId = req.user!.userId

    // Get user info from Firestore
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' })

    const reference = `contrib_${userId.slice(0, 8)}_${Date.now()}`
    await createPendingContribution(userId, amount_kobo, reference)

    res.json({
      reference,
      amount_kobo,
      amount_display: formatNaira(amount_kobo),
      status: 'pending',
      message: 'Payment initiated. Use the reference to make payment.',
      payment_methods: [
        {
          type: 'transfer',
          instructions: `Transfer ${formatNaira(amount_kobo)} to SIS Club account with reference: ${reference}`,
        },
      ],
    })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message })
    console.error('Initiate contribution error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /contributions/balance
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const balance = await getContributionBalance(userId)

    const totalContributed = balance?.total_contributed ?? 0
    const totalDisbursed = balance?.total_disbursed ?? 0

    // Contribution count
    const countSnap = await db
      .collection('contributions')
      .where('user_id', '==', userId)
      .where('status', '==', 'success')
      .count()
      .get()
    const count = countSnap.data().count

    // Calculate this month's contributions
    const startOfMonth = new Date()
    startOfMonth.setHours(0, 0, 0, 0)
    startOfMonth.setDate(1)

    // Calculate this month's contributions by fetching successful records and filtering locally (avoids index requirement)
    const thisMonthSnap = await db
      .collection('contributions')
      .where('user_id', '==', userId)
      .where('status', '==', 'success')
      .get()

    let thisMonthTotal = 0
    thisMonthSnap.forEach(doc => {
      const data = doc.data()
      // Only include it if paid_at is present and >= startOfMonth
      if (data.paid_at && data.paid_at.toDate() >= startOfMonth) {
        thisMonthTotal += data.amount || 0
      }
    })

    const maxLoanKobo = Math.floor(totalContributed * LOAN_FACTOR)

    res.json({
      total_contributed_kobo: totalContributed,
      total_contributed_display: formatNaira(totalContributed),
      total_disbursed_kobo: totalDisbursed,
      total_disbursed_display: formatNaira(totalDisbursed),
      net_balance_kobo: totalContributed - totalDisbursed,
      net_balance_display: formatNaira(totalContributed - totalDisbursed),
      max_loan_amount_kobo: maxLoanKobo,
      max_loan_amount_display: formatNaira(maxLoanKobo),
      contribution_count: count,
      this_month_contribution_kobo: thisMonthTotal,
      this_month_contribution_display: formatNaira(thisMonthTotal),
    })
  } catch (error) {
    console.error('Balance error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /contributions/history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10))

    const { data, total } = await getContributionHistory(userId, page, limit)

    const formattedData = data.map((c) => ({
      id: c.id,
      amount_kobo: c.amount,
      amount_display: formatNaira(c.amount),
      status: c.status,
      paid_at_wat: c.paid_at
        ? new Date(c.paid_at).toLocaleString('en-GB', {
            timeZone: 'Africa/Lagos',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
        : null,
      paid_at_iso: c.paid_at,
      paystack_reference: c.paystack_reference,
      channel: c.channel,
    }))

    res.json({
      data: formattedData,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('History error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /contributions/dva
 */
router.get('/dva', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId

    // Check KYC
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists || userDoc.data()!.kyc_status !== 'approved') {
      return res.status(403).json({
        error: 'KYC not approved',
        message: 'Your account verification (KYC) must be approved before accessing your virtual account.',
      })
    }

    // Get DVA from Firestore
    const dvaDoc = await db.collection('paystack_subscriptions').doc(userId).get()
    if (!dvaDoc.exists || !dvaDoc.data()!.dva_account_number) {
      return res.status(404).json({
        error: 'DVA not found',
        message: 'No virtual account found. Please contact support.',
      })
    }

    const d = dvaDoc.data()!
    res.json({
      account_number: d.dva_account_number,
      account_name: d.dva_account_name,
      bank_name: d.dva_bank_name ?? 'Wema Bank',
      bank_code: d.dva_bank_code ?? '035',
      instruction: 'Transfer ₦5,000 to this account monthly. Use your banking app or dial *945*0# for USSD.',
    })
  } catch (error) {
    console.error('DVA error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /contributions/verify
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { reference } = z.object({ reference: z.string() }).parse(req.body)
    const { paystackService } = await import('../services/paystack')
    const txn = await paystackService.verifyTransaction(reference)
    
    if (txn.status === 'success') {
      const { creditContribution } = await import('../services/contributionService')
      const result = await creditContribution(reference, txn.amount, txn.channel || 'card')
      if (result.success) {
        return res.json({ success: true, message: 'Payment verified and credited' })
      } else {
        return res.status(400).json({ error: result.error })
      }
    } else {
      return res.status(400).json({ error: 'Transaction not successful on Paystack' })
    }
  } catch (error) {
    console.error('Verify contribution error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
