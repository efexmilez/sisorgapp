/**
 * Contribution Service — Firebase Firestore
 *
 * Firestore collections used:
 *   contributions/{id}           — individual payment records
 *   contribution_balances/{uid}  — running totals per member
 *   audit_log/{id}               — immutable event log
 */

import '../lib/firebase-admin'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

const db = getFirestore()

const MINIMUM_CONTRIBUTION_KOBO = parseInt(process.env.MONTHLY_AMOUNT_KOBO || '500000', 10)

export interface ContributionRecord {
  id: string
  user_id: string
  amount: number
  status: 'pending' | 'success' | 'failed'
  paystack_reference: string | null
  channel: string | null
  paid_at: string | null
  created_at: string
}

export interface ContributionBalance {
  total_contributed: number
  total_disbursed: number
}

// ─── helpers ───────────────────────────────────────────────────────────────

function toIso(val: any): string | null {
  if (!val) return null
  if (typeof val === 'string') return val
  if (val?.toDate) return (val as Timestamp).toDate().toISOString()
  return null
}

// ─── public API ────────────────────────────────────────────────────────────

export async function getContributionBalance(
  userId: string
): Promise<ContributionBalance | null> {
  const doc = await db.collection('contribution_balances').doc(userId).get()
  if (!doc.exists) return null
  const d = doc.data()!
  return {
    total_contributed: d.total_contributed ?? 0,
    total_disbursed: d.total_disbursed ?? 0,
  }
}

export async function getContributionHistory(
  userId: string,
  page = 1,
  limit = 10
): Promise<{ data: ContributionRecord[]; total: number }> {
  const snap = await db
    .collection('contributions')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc')
    .get()

  const all: ContributionRecord[] = snap.docs.map((doc) => {
    const d = doc.data()
    return {
      id: doc.id,
      user_id: d.user_id,
      amount: d.amount,
      status: d.status,
      paystack_reference: d.paystack_reference ?? null,
      channel: d.channel ?? null,
      paid_at: toIso(d.paid_at),
      created_at: toIso(d.created_at) ?? '',
    }
  })

  const total = all.length
  const offset = (page - 1) * limit
  return { data: all.slice(offset, offset + limit), total }
}

export async function getSuccessfulContributionCount(userId: string): Promise<number> {
  const snap = await db
    .collection('contributions')
    .where('user_id', '==', userId)
    .where('status', '==', 'success')
    .count()
    .get()
  return snap.data().count
}

export async function createPendingContribution(
  userId: string,
  amount: number,
  reference: string
): Promise<ContributionRecord> {
  const docRef = db.collection('contributions').doc()
  const now = FieldValue.serverTimestamp()

  await docRef.set({
    user_id: userId,
    amount,
    status: 'pending',
    paystack_reference: reference,
    channel: null,
    paid_at: null,
    created_at: now,
  })

  return {
    id: docRef.id,
    user_id: userId,
    amount,
    status: 'pending',
    paystack_reference: reference,
    channel: null,
    paid_at: null,
    created_at: new Date().toISOString(),
  }
}

export async function creditContribution(
  reference: string,
  amount: number,
  channel: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  // Find by Paystack reference
  const snap = await db
    .collection('contributions')
    .where('paystack_reference', '==', reference)
    .limit(1)
    .get()

  if (snap.empty) return { success: false, error: 'Contribution not found' }

  const docRef = snap.docs[0].ref
  const contribution = snap.docs[0].data()
  const userId: string = contribution.user_id

  if (contribution.status === 'success') return { success: true, userId }

  if (amount < MINIMUM_CONTRIBUTION_KOBO) {
    return {
      success: false,
      error: `Minimum contribution is ₦${MINIMUM_CONTRIBUTION_KOBO / 100}`,
    }
  }

  // Atomic update: contribution + balance
  // Read balance FIRST, then do all writes (Firestore transaction rule: all reads must come before writes)
  const balanceRef = db.collection('contribution_balances').doc(userId)
  const balanceDoc = await balanceRef.get()

  await db.runTransaction(async (t) => {
    t.update(docRef, {
      status: 'success',
      paid_at: FieldValue.serverTimestamp(),
      channel,
    })

    if (balanceDoc.exists) {
      t.update(balanceRef, {
        total_contributed: FieldValue.increment(amount),
        last_updated: FieldValue.serverTimestamp(),
      })
    } else {
      t.set(balanceRef, {
        user_id: userId,
        total_contributed: amount,
        total_disbursed: 0,
        last_updated: FieldValue.serverTimestamp(),
      })
    }
  })

  // Audit
  await db.collection('audit_log').add({
    actor_id: null,
    action: 'contribution_credited',
    collection: 'contributions',
    record_id: snap.docs[0].id,
    diff: { amount_kobo: amount, reference },
    created_at: FieldValue.serverTimestamp(),
  })

  return { success: true, userId }
}

export async function getUsersWithoutContributionThisMonth(): Promise<string[]> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [usersSnap, contribSnap] = await Promise.all([
    db.collection('users').where('kyc_status', '==', 'approved').get(),
    db
      .collection('contributions')
      .where('status', '==', 'success')
      .where('paid_at', '>=', Timestamp.fromDate(startOfMonth))
      .where('paid_at', '<=', Timestamp.fromDate(endOfMonth))
      .get(),
  ])

  const contributedIds = new Set(contribSnap.docs.map((d) => d.data().user_id))
  return usersSnap.docs.filter((d) => !contributedIds.has(d.id)).map((d) => d.id)
}
