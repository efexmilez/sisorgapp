/**
 * Paystack Webhook Handler — Firebase Firestore
 * Handles charge.success, transfer.success, transfer.failed events
 */

import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import '../lib/firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { creditContribution } from '../services/contributionService'
import { notificationService } from '../services/notificationService'

const router = Router()
const db = getFirestore()

interface PaystackEvent {
  event: string
  data: {
    reference?: string
    amount?: number
    channel?: string
    paid_at?: string
    transfer_code?: string
    transfer?: {
      amount?: number
    }
    reason?: string
    currency?: string
    customer?: {
      email?: string
    }
  }
}

/**
 * Verify Paystack webhook signature
 */
function verifySignature(req: Request): boolean {
  const signature = req.headers['x-paystack-signature'] as string
  const secret = process.env.PAYSTACK_SECRET_KEY

  if (!secret || !signature) {
    console.error('Missing Paystack signature or secret')
    return false
  }

  const hash = crypto
    .createHmac('sha512', secret)
    .update(req.body)
    .digest('hex')

  return hash === signature
}

/**
 * POST /webhook/paystack
 */
router.post('/paystack', async (req: Request, res: Response) => {
  try {
    if (!verifySignature(req)) {
      console.error('Invalid webhook signature')
      return res.status(401).json({ error: 'Invalid signature' })
    }

    const event: PaystackEvent = JSON.parse(req.body.toString())
    console.log(`[Webhook] Event: ${event.event}`)

    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data)
        break
      case 'transfer.success':
        await handleTransferSuccess(event.data)
        break
      case 'transfer.failed':
        await handleTransferFailed(event.data)
        break
      default:
        console.log(`[Webhook] Unhandled event: ${event.event}`)
    }

    // Always return 200 to prevent Paystack retries
    res.sendStatus(200)
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error)
    res.sendStatus(200)
  }
})

/**
 * Handle successful charge (contribution payment)
 */
async function handleChargeSuccess(data: PaystackEvent['data']): Promise<void> {
  const reference = data.reference
  const amount = data.amount || 0
  const channel = data.channel || 'unknown'

  if (!reference) {
    console.error('[Webhook] Missing reference in charge.success')
    return
  }

  console.log(`[Webhook] Processing charge.success: ${reference} (${amount} kobo)`)

  const result = await creditContribution(reference, amount, channel)

  if (!result.success) {
    console.error(`[Webhook] Failed to credit contribution: ${result.error}`)
    return
  }

  console.log(`[Webhook] Contribution credited for user: ${result.userId}`)

  // Get user's current total from Firestore
  const balanceDoc = await db.collection('contribution_balances').doc(result.userId!).get()
  const totalContributed: number = balanceDoc.exists
    ? (balanceDoc.data()!.total_contributed ?? 0)
    : 0

  const now = new Date()
  const month = now.toLocaleString('en-NG', { month: 'long', timeZone: 'Africa/Lagos' })
  const year = now.getFullYear()

  await notificationService.contributionSuccess(result.userId!, amount, totalContributed, month, year)
}

/**
 * Handle successful transfer (loan disbursement)
 */
async function handleTransferSuccess(data: PaystackEvent['data']): Promise<void> {
  const transferCode = data.transfer_code
  const amount = data.transfer?.amount || data.amount || 0

  if (!transferCode) {
    console.error('[Webhook] Missing transfer_code in transfer.success')
    return
  }

  console.log(`[Webhook] Processing transfer.success: ${transferCode}`)

  // Find loan by transfer code
  const loanSnap = await db
    .collection('loans')
    .where('paystack_transfer_code', '==', transferCode)
    .limit(1)
    .get()

  if (loanSnap.empty) {
    console.error('[Webhook] Loan not found for transfer:', transferCode)
    return
  }

  const loanDoc = loanSnap.docs[0]
  const loan = { id: loanDoc.id, ...loanDoc.data() } as any

  // Update loan status to disbursed
  await db.collection('loans').doc(loan.id).update({
    status: 'disbursed',
    disbursed_at: FieldValue.serverTimestamp(),
  })

  // Increment total_disbursed in contribution_balances
  await db.collection('contribution_balances').doc(loan.user_id).update({
    total_disbursed: FieldValue.increment(amount),
    last_updated: FieldValue.serverTimestamp(),
  })

  // Audit log
  await db.collection('audit_log').add({
    action: 'loan_disbursed',
    collection: 'loans',
    record_id: loan.id,
    diff: { transfer_code: transferCode, amount_kobo: amount },
    created_at: FieldValue.serverTimestamp(),
  })

  // Get user bank info for notification
  const userDoc = await db.collection('users').doc(loan.user_id).get()
  const user = userDoc.data()

  await notificationService.loanDisbursed(
    loan.user_id,
    amount,
    loan.total_repayment,
    loan.due_date
      ? new Date(loan.due_date?.toDate?.() ?? loan.due_date).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' })
      : 'N/A',
    user?.bank_name || 'your bank',
    user?.bank_account_number?.slice(-4) || '****'
  )
}

/**
 * Handle failed transfer
 */
async function handleTransferFailed(data: PaystackEvent['data']): Promise<void> {
  const transferCode = data.transfer_code
  const reason = data.reason || 'Unknown error'

  if (!transferCode) {
    console.error('[Webhook] Missing transfer_code in transfer.failed')
    return
  }

  console.log(`[Webhook] Processing transfer.failed: ${transferCode} - ${reason}`)

  // Find loan by transfer code
  const loanSnap = await db
    .collection('loans')
    .where('paystack_transfer_code', '==', transferCode)
    .limit(1)
    .get()

  if (loanSnap.empty) {
    console.error('[Webhook] Loan not found for failed transfer:', transferCode)
    return
  }

  const loanDoc = loanSnap.docs[0]
  const loan = { id: loanDoc.id, ...loanDoc.data() } as any

  // Revert to approved status
  await db.collection('loans').doc(loan.id).update({
    status: 'approved',
    admin_notes: `${loan.admin_notes || ''} | Transfer failed: ${reason}`.trim(),
  })

  // Audit log
  await db.collection('audit_log').add({
    action: 'loan_transfer_failed',
    collection: 'loans',
    record_id: loan.id,
    diff: { transfer_code: transferCode, reason },
    created_at: FieldValue.serverTimestamp(),
  })

  // Notify user
  await notificationService.send({
    userId: loan.user_id,
    type: 'loan_transfer_failed',
    channel: 'both',
    subject: 'Loan Transfer Update',
    body: `your loan disbursement failed: ${reason}. Please contact support.`,
  })
}

export default router
