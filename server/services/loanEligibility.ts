/**
 * Loan Eligibility Service — Firebase Firestore
 */

import '../lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { formatNaira } from '../utils/formatNaira'

const db = getFirestore()

export interface EligibilityResult {
  eligible: boolean
  maxLoanKobo: number
  maxLoanDisplay: string
  totalContributedKobo: number
  totalContributedDisplay: string
  contributionCount: number
  reason: string | null
}

const MIN_MONTHS = parseInt(process.env.MIN_CONTRIBUTION_MONTHS || '3', 10)
const MONTHLY_AMOUNT_KOBO = parseInt(process.env.MONTHLY_AMOUNT_KOBO || '500000', 10)
const LOAN_FACTOR = parseFloat(process.env.LOAN_FACTOR || '0.2')
const MAX_LOAN_KOBO = parseInt(process.env.MAX_LOAN_KOBO || '50000000', 10)

function ineligible(reason: string, contributionCount = 0, totalContributedKobo = 0): EligibilityResult {
  return {
    eligible: false,
    maxLoanKobo: 0,
    maxLoanDisplay: formatNaira(0),
    totalContributedKobo,
    totalContributedDisplay: formatNaira(totalContributedKobo),
    contributionCount,
    reason,
  }
}

export async function checkEligibility(userId: string): Promise<EligibilityResult> {
  // 1. KYC status
  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) return ineligible('User not found.')

  const user = userDoc.data()!

  if (user.kyc_status !== 'approved') {
    return ineligible('Your account verification (KYC) is not yet approved.')
  }

  // 2. BVN verified
  if (!user.bvn_encrypted) {
    return ineligible('BVN verification is required before applying for a loan.')
  }

  // 3. No active loans
  const activeLoansSnap = await db
    .collection('loans')
    .where('user_id', '==', userId)
    .where('status', 'in', ['pending', 'approved', 'awaiting_transfer', 'disbursed'])
    .limit(1)
    .get()

  if (!activeLoansSnap.empty) {
    return ineligible('You have an active loan. Please complete repayment before applying.')
  }

  // 4. Minimum contribution months
  const countSnap = await db
    .collection('contributions')
    .where('user_id', '==', userId)
    .where('status', '==', 'success')
    .count()
    .get()

  const contributionCount = countSnap.data().count

  if (contributionCount < MIN_MONTHS) {
    return ineligible(
      `You need at least ${MIN_MONTHS} months of contributions. You currently have ${contributionCount}.`,
      contributionCount
    )
  }

  // 5. Minimum total contributed
  const balanceDoc = await db.collection('contribution_balances').doc(userId).get()
  const totalContributed: number = balanceDoc.exists
    ? (balanceDoc.data()!.total_contributed ?? 0)
    : 0

  const requiredMinimum = MIN_MONTHS * MONTHLY_AMOUNT_KOBO
  if (totalContributed < requiredMinimum) {
    return ineligible(
      `You need at least ${formatNaira(requiredMinimum)} in contributions. Current: ${formatNaira(totalContributed)}`,
      contributionCount,
      totalContributed
    )
  }

  // 6. Calculate max loan
  const maxLoanKobo = Math.min(Math.floor(totalContributed * LOAN_FACTOR), MAX_LOAN_KOBO)

  return {
    eligible: true,
    maxLoanKobo,
    maxLoanDisplay: formatNaira(maxLoanKobo),
    totalContributedKobo: totalContributed,
    totalContributedDisplay: formatNaira(totalContributed),
    contributionCount,
    reason: null,
  }
}

export function calculateLoanDetails(
  amountKobo: number,
  interestRate = parseFloat(process.env.INTEREST_RATE || '5')
) {
  const interestKobo = Math.round(amountKobo * (interestRate / 100))
  const totalRepaymentKobo = amountKobo + interestKobo
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 90)

  return {
    interestRate,
    interestKobo,
    interestDisplay: formatNaira(interestKobo),
    totalRepaymentKobo,
    totalRepaymentDisplay: formatNaira(totalRepaymentKobo),
    dueDate,
  }
}
