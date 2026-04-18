/**
 * Loans Routes — Firebase Firestore
 * GET  /loans/eligibility
 * POST /loans/apply
 * GET  /loans/my-loans
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import '../lib/firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { checkEligibility, calculateLoanDetails } from '../services/loanEligibility'
import { notificationService } from '../services/notificationService'
import { formatNaira } from '../utils/formatNaira'

const router = Router()
const db = getFirestore()

router.use(authMiddleware)

const LOAN_FACTOR = parseFloat(process.env.LOAN_FACTOR || '0.2')
const INTEREST_RATE = parseFloat(process.env.INTEREST_RATE || '5')
const MAX_LOAN_KOBO = parseInt(process.env.MAX_LOAN_KOBO || '50000000', 10)

/**
 * GET /loans/eligibility
 */
router.get('/eligibility', async (req: Request, res: Response) => {
  try {
    const result = await checkEligibility(req.user!.userId)
    res.json({
      eligible: result.eligible,
      max_loan_amount_kobo: result.maxLoanKobo,
      max_loan_amount_display: result.maxLoanDisplay,
      total_contributed_kobo: result.totalContributedKobo,
      total_contributed_display: result.totalContributedDisplay,
      contribution_count: result.contributionCount,
      reason: result.reason,
    })
  } catch (error) {
    console.error('Eligibility error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /loans/apply
 */
const applySchema = z.object({
  amount_kobo: z.number().int().positive(),
  purpose: z.string().min(20, 'Please describe your loan purpose (min 20 characters)'),
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the loan terms to proceed' }),
  }),
})

router.post('/apply', async (req: Request, res: Response) => {
  try {
    const body = applySchema.parse(req.body)
    const userId = req.user!.userId

    const eligibility = await checkEligibility(userId)
    if (!eligibility.eligible) return res.status(400).json({ error: eligibility.reason })

    if (body.amount_kobo > eligibility.maxLoanKobo) {
      return res.status(400).json({
        error: `Amount exceeds maximum eligible loan of ${eligibility.maxLoanDisplay}`,
      })
    }

    const cappedAmount = Math.min(body.amount_kobo, MAX_LOAN_KOBO)
    const { interestKobo, totalRepaymentKobo, dueDate } = calculateLoanDetails(cappedAmount, INTEREST_RATE)

    const loanRef = db.collection('loans').doc()
    const now = FieldValue.serverTimestamp()

    await loanRef.set({
      user_id: userId,
      amount_requested: cappedAmount,
      purpose: body.purpose,
      factor_at_application: LOAN_FACTOR,
      amount_approved: cappedAmount,
      interest_rate: INTEREST_RATE,
      total_repayment: totalRepaymentKobo,
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      status: 'pending',
      due_date: dueDate.toISOString(),
      admin_notes: null,
      applied_at: now,
      created_at: now,
    })

    // Audit log
    await db.collection('audit_log').add({
      actor_id: userId,
      action: 'loan_applied',
      collection: 'loans',
      record_id: loanRef.id,
      diff: { amount_kobo: cappedAmount, purpose: body.purpose },
      created_at: now,
    })

    await notificationService.loanApplied(userId, cappedAmount)

    res.status(201).json({
      id: loanRef.id,
      amount_requested_kobo: cappedAmount,
      amount_requested_display: formatNaira(cappedAmount),
      interest_rate: INTEREST_RATE,
      interest_amount_kobo: interestKobo,
      interest_amount_display: formatNaira(interestKobo),
      total_repayment_kobo: totalRepaymentKobo,
      total_repayment_display: formatNaira(totalRepaymentKobo),
      due_date: dueDate.toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' }),
      status: 'pending',
      message: 'Your loan application has been submitted. You will be notified within 24-48 hours.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message })
    console.error('Loan apply error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /loans/my-loans
 */
router.get('/my-loans', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10))

    const snap = await db
      .collection('loans')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .get()

    const all = snap.docs.map((doc) => {
      const d = doc.data()
      const toDate = (v: any) => v?.toDate?.()?.toISOString() ?? v ?? null
      return {
        id: doc.id,
        amount_requested: d.amount_requested,
        amount_approved: d.amount_approved,
        total_repayment: d.total_repayment,
        status: d.status,
        applied_at: toDate(d.applied_at),
        due_date: toDate(d.due_date),
        purpose: d.purpose,
        interest_rate: d.interest_rate,
      }
    })

    const total = all.length
    const offset = (page - 1) * limit
    const loans = all.slice(offset, offset + limit)

    const formattedLoans = loans.map((l) => ({
      id: l.id,
      amount_requested_kobo: l.amount_requested,
      amount_requested_display: formatNaira(l.amount_requested),
      amount_approved_kobo: l.amount_approved,
      amount_approved_display: formatNaira(l.amount_approved),
      total_repayment_display: formatNaira(l.total_repayment),
      status: l.status,
      applied_at: l.applied_at
        ? new Date(l.applied_at).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' })
        : null,
      due_date: l.due_date
        ? new Date(l.due_date).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' })
        : null,
      purpose: l.purpose,
      interest_rate: l.interest_rate,
    }))

    res.json({
      data: formattedLoans,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('My loans error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
