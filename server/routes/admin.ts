/**
 * Admin Routes — Firebase Firestore
 * All routes require admin role.
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authMiddleware, requireAdmin } from '../middleware/auth'
import '../lib/firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { paystackService } from '../services/paystack'
import { notificationService } from '../services/notificationService'
import * as contributionService from '../services/contributionService'
import { maskField } from '../utils/encrypt'
import { formatNaira } from '../utils/formatNaira'

const router = Router()
const db = getFirestore()

router.use(authMiddleware)
router.use(requireAdmin)

// ─── helpers ───────────────────────────────────────────────────────────────

function toDateStr(val: any): string | null {
  if (!val) return null
  try {
    const d = val?.toDate?.() ?? new Date(val)
    return d.toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' })
  } catch { return null }
}

// ─── GET /admin/users ──────────────────────────────────────────────────────

router.get('/users', async (req: Request, res: Response) => {
  try {
    const kycStatus = req.query.kyc_status as string | undefined
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10))

    let snap;
    try {
      snap = await db.collection('users').orderBy('created_at', 'desc').get()
    } catch (err) {
      console.warn('Users orderBy created_at failed (possibly missing index), falling back to unordered get', err)
      snap = await db.collection('users').get()
    }
    
    let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() as any }))

    if (kycStatus && ['pending', 'approved', 'rejected'].includes(kycStatus)) {
      docs = docs.filter((u) => u.kyc_status === kycStatus)
    }

    const total = docs.length
    const offset = (page - 1) * limit
    const page_docs = docs.slice(offset, offset + limit)

    const data = page_docs.map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      state: u.state,
      lga: u.lga,
      id_type: u.id_type,
      id_number_masked: u.nin_encrypted ? maskField(u.nin_encrypted) : u.bvn_encrypted ? maskField(u.bvn_encrypted) : '****',
      kyc_status: u.kyc_status,
      national_id_url: u.national_id_url ?? null,
      utility_bill_url: u.utility_bill_url ?? null,
      created_at: toDateStr(u.created_at) ?? '',
    }))

    res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (error: any) {
    console.error('Admin summary error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// ─── PATCH /admin/users/:id/kyc ────────────────────────────────────────────

const kycSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejection_reason: z.string().optional(),
})

router.patch('/users/:id/kyc', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = kycSchema.parse(req.body)
    const adminId = req.user!.userId

    const userDoc = await db.collection('users').doc(id).get()
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' })
    const user = userDoc.data()!

    if (body.status === 'approved') {
      let customerCode = user.paystack_customer_code
      let dvaData: any = null

      try {
        // Create Paystack customer if not exists
        if (!customerCode) {
          const customer = await paystackService.createCustomer({
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
          })
          customerCode = customer.customer_code
        }

        // Try to create DVA
        try {
          dvaData = await paystackService.createDVA(customerCode, {
            full_name: user.full_name,
            email: user.email,
          })
        } catch (dvaErr: any) {
          console.error('Paystack DVA creation failed during KYC approval:', dvaErr.message)
          // Non-fatal: proceed with KYC approval even if DVA fails
        }

        if (dvaData) {
          await db.collection('paystack_subscriptions').doc(id).set(
            {
              user_id: id,
              dva_account_number: dvaData.account_number,
              dva_account_name: dvaData.account_name,
              dva_bank_name: dvaData.bank.name,
              dva_bank_code: '035',
              paystack_customer_code: customerCode,
              status: 'active',
            },
            { merge: true }
          )
        }
      } catch (psErr: any) {
        console.error('Paystack customer creation failed during KYC approval:', psErr.message)
        // Also non-fatal for the user approval state, but DVA won't be created
      }

      // Update user doc regardless of Paystack success
      await db.collection('users').doc(id).update({
        kyc_status: 'approved',
        paystack_customer_code: customerCode || null,
      })

      // Initialise contribution balance if it doesn't exist
      await db.collection('contribution_balances').doc(id).set(
        { user_id: id, total_contributed: 0, total_disbursed: 0, last_updated: FieldValue.serverTimestamp() },
        { merge: true }
      )

      if (dvaData) {
        await notificationService.kycApproved(id, dvaData.account_number, dvaData.account_name)
      } else {
        await notificationService.kycApproved(id, 'Pending', 'Pending') // Fallback if DVA failed
      }
    } else {
      await db.collection('users').doc(id).update({
        kyc_status: 'rejected',
        kyc_rejection_reason: body.rejection_reason ?? 'Not specified',
      })
      await notificationService.kycRejected(id, body.rejection_reason ?? 'Not specified')
    }

    await db.collection('audit_log').add({
      actor_id: adminId,
      actor_role: 'admin',
      action: `kyc_${body.status}`,
      collection: 'users',
      record_id: id,
      diff: { status: body.status },
      created_at: FieldValue.serverTimestamp(),
    })

    res.json({ message: `KYC ${body.status} successfully`, kyc_status: body.status })
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message })
    console.error('Admin KYC error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// ─── GET /admin/verify-account ─────────────────────────────────────────────

router.get('/verify-account', async (req: Request, res: Response) => {
  try {
    const { account_number, bank_code } = req.query
    if (!account_number || !bank_code) {
      return res.status(400).json({ error: 'account_number and bank_code are required' })
    }
    const result = await paystackService.resolveAccount(account_number as string, bank_code as string)
    res.json({ account_name: result.account_name, account_number: result.account_number })
  } catch (error: any) {
    console.error('Verify account error:', error)
    res.status(400).json({ error: error.message || 'Could not verify account' })
  }
})

// ─── GET /admin/loans ──────────────────────────────────────────────────────

router.get('/loans', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10))

    let snap;
    try {
      snap = await db.collection('loans').orderBy('created_at', 'desc').get()
    } catch (err) {
      console.warn('Loans orderBy created_at failed, falling back to unordered get', err)
      snap = await db.collection('loans').get()
    }
    let loans = snap.docs.map((d) => ({ id: d.id, ...d.data() as any }))
    if (status) loans = loans.filter((l) => l.status === status)

    const total = loans.length
    const offset = (page - 1) * limit
    const page_loans = loans.slice(offset, offset + limit)

    // Batch fetch users and balances
    const userIds = [...new Set(page_loans.map((l) => l.user_id as string))]
    const [userDocs, balanceDocs] = await Promise.all([
      Promise.all(userIds.map((uid) => db.collection('users').doc(uid).get())),
      Promise.all(userIds.map((uid) => db.collection('contribution_balances').doc(uid).get())),
    ])
    const usersMap = new Map(userDocs.map((d) => [d.id, d.data()]))
    const balancesMap = new Map(balanceDocs.map((d) => [d.id, d.data()]))

    const data = page_loans.map((l) => ({
      id: l.id,
      user: {
        full_name: usersMap.get(l.user_id)?.full_name ?? 'Unknown',
        phone: usersMap.get(l.user_id)?.phone ?? '',
      },
      amount_requested_display: formatNaira(l.amount_requested),
      amount_approved_display: formatNaira(l.amount_approved),
      member_total_savings_display: formatNaira(balancesMap.get(l.user_id)?.total_contributed ?? 0),
      total_repayment_display: formatNaira(l.total_repayment),
      status: l.status,
      applied_at: toDateStr(l.applied_at),
      purpose: l.purpose,
    }))

    res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (error: any) {
    console.error('Admin update loan status error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// ─── PATCH /admin/loans/:id/review ─────────────────────────────────────────

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  amount_approved_kobo: z.number().int().positive().optional(),
  admin_notes: z.string().min(3, 'Admin notes must be at least 3 characters'),
})

router.patch('/loans/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = reviewSchema.parse(req.body)
    const adminId = req.user!.userId

    const loanDoc = await db.collection('loans').doc(id).get()
    if (!loanDoc.exists) return res.status(404).json({ error: 'Loan not found' })
    const loan = loanDoc.data()!

    if (loan.status !== 'pending') {
      return res.status(400).json({ error: 'Loan is not pending review' })
    }

    if (body.status === 'approved') {
      if (!body.amount_approved_kobo) {
        return res.status(400).json({ error: 'amount_approved_kobo is required for approval' })
      }
      const interest = Math.round(body.amount_approved_kobo * ((loan.interest_rate ?? 5) / 100))
      const totalRepayment = body.amount_approved_kobo + interest

      await db.collection('loans').doc(id).update({
        status: 'approved',
        amount_approved: body.amount_approved_kobo,
        total_repayment: totalRepayment,
        admin_notes: body.admin_notes,
        approved_at: FieldValue.serverTimestamp(),
      })

      await notificationService.loanApproved(
        loan.user_id,
        body.amount_approved_kobo,
        loan.due_date ? new Date(loan.due_date.toDate?.() ?? loan.due_date).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' }) : 'N/A'
      )
    } else {
      await db.collection('loans').doc(id).update({
        status: 'rejected',
        admin_notes: body.admin_notes,
      })
      await notificationService.loanRejected(loan.user_id, body.admin_notes)
    }

    await db.collection('audit_log').add({
      actor_id: adminId,
      actor_role: 'admin',
      action: `loan_${body.status}`,
      collection: 'loans',
      record_id: id,
      diff: { status: body.status, amount_approved: body.amount_approved_kobo, admin_notes: body.admin_notes },
      created_at: FieldValue.serverTimestamp(),
    })

    res.json({ message: `Loan ${body.status} successfully`, status: body.status })
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message })
    console.error('Admin loan review error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// ─── PATCH /admin/loans/:id/disburse ───────────────────────────────────────

router.patch('/loans/:id/disburse', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const adminId = req.user!.userId

    const loanDoc = await db.collection('loans').doc(id).get()
    if (!loanDoc.exists) return res.status(404).json({ error: 'Loan not found' })
    const loan = loanDoc.data()!

    if (loan.status !== 'approved') {
      return res.status(400).json({ error: 'Loan must be approved before disbursement' })
    }

    const userDoc = await db.collection('users').doc(loan.user_id).get()
    const user = userDoc.data()!

    if (!user.bank_account_number || !user.bank_code) {
      return res.status(400).json({ error: 'Member has not saved bank account details.' })
    }

    // Verify account name match
    try {
      const resolved = await paystackService.resolveAccount(user.bank_account_number, user.bank_code)
      const memberLower = user.full_name.toLowerCase()
      const resolvedLower = resolved.account_name.toLowerCase()
      const hasMatch = memberLower.split(' ').some((p: string) => p.length > 3 && resolvedLower.includes(p))
      if (!hasMatch) {
        return res.status(400).json({
          error: 'Bank account name does not match member name.',
          resolved_name: resolved.account_name,
          member_name: user.full_name,
        })
      }
    } catch {
      console.warn('Could not verify bank account name')
    }

    const recipient = await paystackService.createTransferRecipient({
      full_name: user.full_name,
      bank_account_number: user.bank_account_number,
      bank_code: user.bank_code,
    })

    const transfer = await paystackService.initiateTransfer(
      loan.amount_approved,
      recipient.recipient_code,
      `SIS Club Loan - ${user.full_name}`
    )

    await db.collection('loans').doc(id).update({
      status: 'awaiting_transfer',
      paystack_transfer_code: transfer.transfer_code,
      paystack_recipient_code: recipient.recipient_code,
    })

    await db.collection('audit_log').add({
      actor_id: adminId,
      actor_role: 'admin',
      action: 'loan_disburse_initiated',
      collection: 'loans',
      record_id: id,
      diff: { transfer_code: transfer.transfer_code, amount_kobo: loan.amount_approved },
      created_at: FieldValue.serverTimestamp(),
    })

    res.json({
      message: 'Transfer initiated',
      transfer_code: transfer.transfer_code,
      amount_display: formatNaira(loan.amount_approved),
      recipient_account: `${user.bank_name} - ${user.bank_account_number} (${user.full_name})`,
    })
  } catch (error: any) {
    console.error('Admin disburse error:', error)
    res.status(500).json({ error: error.message || 'Failed to initiate transfer' })
  }
})

// ─── GET /admin/liquidity ──────────────────────────────────────────────────

router.get('/liquidity', async (req: Request, res: Response) => {
  try {
    const safeGetCount = async (query: any) => {
      try { return (await query.count().get()).data().count }
      catch (e) { console.error('Count query failed:', e); return 0 }
    }

    const [
      balancesSnap,
      totalMembers,
      approvedMembers,
      activeLoans,
      pendingLoans,
    ] = await Promise.all([
      db.collection('contribution_balances').get().catch(() => ({ docs: [] })),
      safeGetCount(db.collection('users')),
      safeGetCount(db.collection('users').where('kyc_status', '==', 'approved')),
      safeGetCount(db.collection('loans').where('status', 'in', ['disbursed', 'awaiting_transfer'])),
      safeGetCount(db.collection('loans').where('status', '==', 'pending')),
    ])

    const balancesDocs = (balancesSnap as any).docs || []
    let totalContributed = 0
    let totalDisbursed = 0
    for (const d of balancesDocs) {
      const data = d.data()
      totalContributed += (data.total_contributed ?? 0)
      totalDisbursed += (data.total_disbursed ?? 0)
    }

    // We also need kyc_pending
    const kycPending = await safeGetCount(db.collection('users').where('kyc_status', '==', 'pending'))

    // We also need total_loaned amount (sum of disbursed loans)
    const loansSnap = await db.collection('loans').where('status', '==', 'disbursed').get()
    const totalLoaned = loansSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0)

    res.json({
      total_contributed_kobo: totalContributed,
      total_contributed_display: formatNaira(totalContributed),
      total_users: totalMembers,
      kyc_pending: kycPending,
      total_loaned_kobo: totalLoaned,
      total_loaned_display: formatNaira(totalLoaned),
      active_loans: activeLoans,
      pending_loans: pendingLoans,
      // Keep these for backward compatibility or other usage
      total_disbursed_kobo: totalDisbursed,
      total_disbursed_display: formatNaira(totalDisbursed),
      available_kobo: totalContributed - totalDisbursed,
      available_display: formatNaira(totalContributed - totalDisbursed),
    })
  } catch (error: any) {
    console.error('Liquidity error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// ─── GET /admin/contributions ──────────────────────────────────────────────

router.get('/contributions', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20))

    let snap;
    try {
      snap = await db.collection('contributions').orderBy('created_at', 'desc').get()
    } catch (err) {
      console.warn('Contributions orderBy created_at failed, falling back to unordered get', err)
      snap = await db.collection('contributions').get()
    }
    let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() as any }))

    if (status && ['pending', 'success', 'failed'].includes(status)) {
      docs = docs.filter((c) => c.status === status)
    }

    const total = docs.length
    const offset = (page - 1) * limit
    const page_docs = docs.slice(offset, offset + limit)

    // Batch fetch users
    const userIds = [...new Set(page_docs.map((c) => c.user_id as string).filter(Boolean))]
    const userDocs = await Promise.all(userIds.map((uid) => db.collection('users').doc(uid).get()))
    const usersMap = new Map(userDocs.map((d) => [d.id, d.data()]))

    const data = page_docs.map((c) => ({
      id: c.id,
      user_id: c.user_id,
      user: {
        full_name: usersMap.get(c.user_id)?.full_name ?? 'Unknown',
        email: usersMap.get(c.user_id)?.email ?? '',
        phone: usersMap.get(c.user_id)?.phone ?? '',
      },
      amount_kobo: c.amount,
      amount_display: formatNaira(c.amount),
      status: c.status,
      channel: c.channel ?? null,
      paystack_reference: c.paystack_reference ?? null,
      paid_at: toDateStr(c.paid_at) ?? null,
      created_at: toDateStr(c.created_at) ?? '',
    }))

    res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (error: any) {
    console.error('Admin fetch contributions error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// ─── PATCH /admin/contributions/:id/approve ────────────────────────────────

router.patch('/contributions/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const adminId = req.user!.userId

    const contribDoc = await db.collection('contributions').doc(id).get()
    if (!contribDoc.exists) return res.status(404).json({ error: 'Contribution not found' })
    const contrib = contribDoc.data()!

    if (contrib.status !== 'pending') {
      return res.status(400).json({ error: `Contribution is already ${contrib.status}` })
    }

    const amount: number = contrib.amount
    const userId: string = contrib.user_id

    const reference = contrib.paystack_reference || id;
    
    // Use the central unified service to guarantee matching metrics across everything
    const result = await contributionService.creditContribution(reference, amount, 'manual');
    if (!result.success) {
      throw new Error(result.error || 'Failed to apply contribution credit.');
    }

    await db.collection('audit_log').add({
      actor_id: adminId,
      actor_role: 'admin',
      action: 'contribution_approved',
      collection: 'contributions',
      record_id: id,
      diff: { status: 'success', amount_kobo: amount },
      created_at: FieldValue.serverTimestamp(),
    })

    res.json({ message: 'Contribution approved', status: 'success' })
  } catch (error: any) {
    console.error('Admin approve contribution error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// ─── PATCH /admin/contributions/:id/reject ─────────────────────────────────

const rejectContribSchema = z.object({
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
})

router.patch('/contributions/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = rejectContribSchema.parse(req.body)
    const adminId = req.user!.userId

    const contribDoc = await db.collection('contributions').doc(id).get()
    if (!contribDoc.exists) return res.status(404).json({ error: 'Contribution not found' })
    const contrib = contribDoc.data()!

    if (contrib.status !== 'pending') {
      return res.status(400).json({ error: `Contribution is already ${contrib.status}` })
    }

    await db.collection('contributions').doc(id).update({
      status: 'failed',
      admin_rejection_reason: body.reason,
    })

    await db.collection('audit_log').add({
      actor_id: adminId,
      actor_role: 'admin',
      action: 'contribution_rejected',
      collection: 'contributions',
      record_id: id,
      diff: { status: 'failed', reason: body.reason },
      created_at: FieldValue.serverTimestamp(),
    })

    res.json({ message: 'Contribution rejected', status: 'failed' })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message })
    console.error('Admin reject contribution error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ─── GET /admin/users/:id ──────────────────────────────────────────────────

router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const [userDoc, balanceDoc, subscriptionDoc] = await Promise.all([
      db.collection('users').doc(id).get(),
      db.collection('contribution_balances').doc(id).get(),
      db.collection('paystack_subscriptions').doc(id).get(),
    ])

    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' })
    const u = userDoc.data()!
    const balance = balanceDoc.data() ?? {}
    const sub = subscriptionDoc.data() ?? {}

    // Fetch recent loans
    let loansSnap;
    try {
      loansSnap = await db
        .collection('loans')
        .where('user_id', '==', id)
        .orderBy('created_at', 'desc')
        .limit(5)
        .get()
    } catch (err) {
      console.warn('User loans filtered orderBy failed:', err)
      loansSnap = await db
        .collection('loans')
        .where('user_id', '==', id)
        .limit(5)
        .get()
    }

    // Fetch recent contributions
    let contribSnap;
    try {
      contribSnap = await db
        .collection('contributions')
        .where('user_id', '==', id)
        .orderBy('created_at', 'desc')
        .limit(5)
        .get()
    } catch (err) {
      console.warn('User contrib filtered orderBy failed:', err)
      contribSnap = await db
        .collection('contributions')
        .where('user_id', '==', id)
        .limit(5)
        .get()
    }

    const loans = loansSnap.docs.map((d) => {
      const l = d.data()
      return {
        id: d.id,
        amount_requested_display: formatNaira(l.amount_requested),
        amount_approved_display: formatNaira(l.amount_approved),
        status: l.status,
        applied_at: toDateStr(l.applied_at),
        purpose: l.purpose,
      }
    })

    const contributions = contribSnap.docs.map((d) => {
      const c = d.data()
      return {
        id: d.id,
        amount_display: formatNaira(c.amount),
        status: c.status,
        channel: c.channel ?? null,
        paid_at: toDateStr(c.paid_at) ?? null,
        created_at: toDateStr(c.created_at) ?? '',
      }
    })

    res.json({
      id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      state: u.state,
      lga: u.lga,
      street_address: u.street_address ?? '',
      area: u.area ?? '',
      id_type: u.id_type ?? '',
      id_number_masked: u.nin_encrypted ? maskField(u.nin_encrypted) : u.bvn_encrypted ? maskField(u.bvn_encrypted) : '****',
      national_id_url: u.national_id_url ?? null,
      utility_bill_url: u.utility_bill_url ?? null,
      id_doc_url: u.id_doc_url ?? null, // Keep for backward compatibility if any
      kyc_status: u.kyc_status,
      kyc_rejection_reason: u.kyc_rejection_reason ?? null,
      bank_account_number: u.bank_account_number ?? '',
      bank_code: u.bank_code ?? '',
      bank_name: u.bank_name ?? '',
      bvn: u.bvn ?? '',
      created_at: toDateStr(u.created_at) ?? '',
      balance: {
        total_contributed_display: formatNaira(balance.total_contributed ?? 0),
        total_disbursed_display: formatNaira(balance.total_disbursed ?? 0),
        net_display: formatNaira((balance.total_contributed ?? 0) - (balance.total_disbursed ?? 0)),
      },
      dva: sub.dva_account_number ? {
        account_number: sub.dva_account_number,
        account_name: sub.dva_account_name,
        bank_name: sub.dva_bank_name ?? 'Wema Bank',
      } : null,
      recent_loans: loans,
      recent_contributions: contributions,
    })
  } catch (error) {
    console.error('Admin get user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ─── PATCH /admin/users/:id ────────────────────────────────────────────────

const editUserSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().optional(),
  state: z.string().optional(),
  lga: z.string().optional(),
  street_address: z.string().optional(),
  area: z.string().optional(),
  role: z.enum(['member', 'admin']).optional(),
  bank_account_number: z.string().optional(),
  bank_code: z.string().optional(),
  bank_name: z.string().optional(),
  bvn: z.string().optional(),
})

router.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = editUserSchema.parse(req.body)
    const adminId = req.user!.userId

    const userDoc = await db.collection('users').doc(id).get()
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' })

    const updates: Record<string, any> = {}
    for (const [key, val] of Object.entries(body)) {
      if (val !== undefined) updates[key] = val
    }

    await db.collection('users').doc(id).update(updates)

    await db.collection('audit_log').add({
      actor_id: adminId,
      actor_role: 'admin',
      action: 'user_edited',
      collection: 'users',
      record_id: id,
      diff: updates,
      created_at: FieldValue.serverTimestamp(),
    })

    res.json({ message: 'User updated', updated_fields: Object.keys(updates) })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message })
    console.error('Admin edit user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ─── GET /admin/audit-log ──────────────────────────────────────────────────

router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20))

    let snap;
    try {
      snap = await db.collection('audit_log').orderBy('created_at', 'desc').get()
    } catch (err) {
      console.warn('Audit log orderBy failed:', err)
      snap = await db.collection('audit_log').limit(50).get()
    }
    const total = snap.docs.length
    const offset = (page - 1) * limit
    const page_docs = snap.docs.slice(offset, offset + limit)

    const data = page_docs.map((d) => {
      const a = d.data()
      return {
        id: d.id,
        actor_id: a.actor_id ?? null,
        actor_role: a.actor_role ?? 'system',
        action: a.action,
        collection: a.collection,
        record_id: a.record_id,
        diff: a.diff ?? {},
        created_at: toDateStr(a.created_at) ?? '',
      }
    })

    res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('Admin audit log error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
