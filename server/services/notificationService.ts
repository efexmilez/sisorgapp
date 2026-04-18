/**
 * Notification Service — Firebase Firestore
 *
 * Sends email (Resend) and SMS (Termii) then persists a record in
 * the Firestore `notifications/{id}` collection.
 */

import '../lib/firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { formatNaira } from '../utils/formatNaira'

const db = getFirestore()

type NotificationType =
  | 'contribution_success'
  | 'contribution_reminder'
  | 'loan_applied'
  | 'loan_approved'
  | 'loan_rejected'
  | 'loan_disbursed'
  | 'loan_transfer_failed'
  | 'kyc_approved'
  | 'kyc_rejected'

interface NotificationParams {
  userId: string
  type: NotificationType
  channel: 'email' | 'sms' | 'both'
  subject?: string
  body: string
}

interface UserInfo {
  full_name: string
  email: string
  phone: string
}

class NotificationService {
  private async getUser(userId: string): Promise<UserInfo | null> {
    const doc = await db.collection('users').doc(userId).get()
    if (!doc.exists) return null
    const d = doc.data()!
    return {
      full_name: d.full_name ?? '',
      email: d.email ?? '',
      phone: d.phone ?? '',
    }
  }

  async getDVA(
    userId: string
  ): Promise<{ account_number: string; account_name: string } | null> {
    const doc = await db.collection('paystack_subscriptions').doc(userId).get()
    if (!doc.exists) return null
    const d = doc.data()!
    return {
      account_number: d.dva_account_number ?? '',
      account_name: d.dva_account_name ?? '',
    }
  }

  private async persistNotification(
    userId: string,
    type: NotificationType,
    channel: string,
    subject: string,
    body: string
  ): Promise<void> {
    await db.collection('notifications').add({
      user_id: userId,
      type,
      channel,
      subject,
      body,
      is_read: false,
      created_at: FieldValue.serverTimestamp(),
    })
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey || apiKey === 're_placeholder') return

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SIS Club <no-reply@sisclub.ng>',
        to,
        subject,
        html,
      }),
    }).catch((err) => console.error('Email send failed:', err))
  }

  private async sendSMS(phone: string, message: string): Promise<void> {
    const apiKey = process.env.TERMII_API_KEY
    if (!apiKey || apiKey === 'placeholder') return

    await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phone,
        from: 'SISCLUB',
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: apiKey,
      }),
    }).catch((err) => console.error('SMS send failed:', err))
  }

  async send(params: NotificationParams): Promise<void> {
    const user = await this.getUser(params.userId)
    if (!user) { console.error(`Notification: user ${params.userId} not found`); return }

    const firstName = user.full_name.split(' ')[0]
    const subject = params.subject ?? 'SIS Club'

    await this.persistNotification(params.userId, params.type, params.channel, subject, params.body)

    if (params.channel === 'email' || params.channel === 'both') {
      const html = `<p>Dear ${firstName},</p><p>${params.body}</p><p>– SIS Club</p>`
      await this.sendEmail(user.email, subject, html)
    }

    if (params.channel === 'sms' || params.channel === 'both') {
      await this.sendSMS(user.phone, `SIS Club: Dear ${firstName}, ${params.body}`)
    }
  }

  async contributionSuccess(userId: string, amountKobo: number, totalKobo: number, month: string, year: number) {
    await this.send({
      userId, type: 'contribution_success', channel: 'both',
      subject: 'Contribution Received',
      body: `your contribution of ${formatNaira(amountKobo)} for ${month} ${year} has been received. Total savings: ${formatNaira(totalKobo)}.`,
    })
  }

  async contributionReminder(userId: string, month: string, accountNumber: string, accountName: string) {
    await this.send({
      userId, type: 'contribution_reminder', channel: 'both',
      subject: 'Monthly Contribution Reminder',
      body: `your ${month} contribution of ₦5,000 is due by month end. Pay to: Wema Bank - ${accountNumber} (${accountName}).`,
    })
  }

  async loanApplied(userId: string, amountKobo: number) {
    await this.send({
      userId, type: 'loan_applied', channel: 'both',
      subject: 'Loan Application Received',
      body: `your loan application of ${formatNaira(amountKobo)} has been received. We will review within 24-48 hours.`,
    })
  }

  async loanApproved(userId: string, amountKobo: number, dueDate: string) {
    await this.send({
      userId, type: 'loan_approved', channel: 'both',
      subject: 'Loan Approved!',
      body: `your loan of ${formatNaira(amountKobo)} has been approved! Disbursement within 24 hours. Repayment due: ${dueDate}.`,
    })
  }

  async loanRejected(userId: string, reason: string) {
    await this.send({
      userId, type: 'loan_rejected', channel: 'both',
      subject: 'Loan Application Update',
      body: `your loan application was not approved. Reason: ${reason}.`,
    })
  }

  async loanDisbursed(userId: string, amountKobo: number, totalRepaymentKobo: number, dueDate: string, bankName: string, last4: string) {
    await this.send({
      userId, type: 'loan_disbursed', channel: 'both',
      subject: 'Loan Disbursed!',
      body: `${formatNaira(amountKobo)} has been sent to your ${bankName} account ending ${last4}. Repay ${formatNaira(totalRepaymentKobo)} by ${dueDate}.`,
    })
  }

  async kycApproved(userId: string, accountNumber: string, accountName: string) {
    await this.send({
      userId, type: 'kyc_approved', channel: 'both',
      subject: 'Identity Verification Complete',
      body: `your identity is verified! Your savings account: Wema Bank - ${accountNumber} (${accountName}). Start saving!`,
    })
  }

  async kycRejected(userId: string, reason: string) {
    await this.send({
      userId, type: 'kyc_rejected', channel: 'both',
      subject: 'Identity Verification Update',
      body: `your KYC was not approved. Reason: ${reason}. Please resubmit on the app.`,
    })
  }
}

export const notificationService = new NotificationService()
export default notificationService
