/**
 * Contribution Reminder Job — Firebase Firestore
 * Sends monthly reminders to members who haven't contributed
 * Runs on the 25th of each month at 9:00 AM WAT
 */

import cron from 'node-cron'
import '../lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { notificationService } from '../services/notificationService'
import { getUsersWithoutContributionThisMonth } from '../services/contributionService'

const db = getFirestore()

export function scheduleContributionReminders(): void {
  // Run at 9:00 AM WAT on the 25th of every month
  cron.schedule(
    '0 9 25 * *',
    async () => {
      console.log('[Cron] Running contribution reminder job...')
      await sendReminders()
    },
    {
      timezone: 'Africa/Lagos',
    }
  )

  console.log('[Cron] Contribution reminder job scheduled: 9:00 AM WAT on the 25th')
}

/**
 * Send reminders to users who haven't contributed this month
 */
async function sendReminders(): Promise<void> {
  try {
    const now = new Date()
    const month = now.toLocaleString('en-NG', { month: 'long', timeZone: 'Africa/Lagos' })

    const userIds = await getUsersWithoutContributionThisMonth()

    console.log(`[Cron] Found ${userIds.length} users without contribution this month`)

    for (const userId of userIds) {
      try {
        // Get user's DVA info from Firestore
        const dvaDoc = await db.collection('paystack_subscriptions').doc(userId).get()

        if (dvaDoc.exists) {
          const dva = dvaDoc.data()!
          if (dva.dva_account_number) {
            await notificationService.contributionReminder(
              userId,
              month,
              dva.dva_account_number,
              dva.dva_account_name || 'SIS Club Account'
            )
            console.log(`[Cron] Sent reminder to user: ${userId}`)
          }
        }
      } catch (error) {
        console.error(`[Cron] Failed to send reminder to user ${userId}:`, error)
      }
    }

    console.log(`[Cron] Sent reminders to ${userIds.length} users for ${month}`)
  } catch (error) {
    console.error('[Cron] Contribution reminder job failed:', error)
  }
}

// Run immediately for testing (comment out in production)
// sendReminders()
