/**
 * Paystack Service
 * Typed wrapper for Paystack API
 */

const PAYSTACK_BASE_URL = 'https://api.paystack.co'

export interface PaystackError extends Error {
  statusCode: number
}

export interface CustomerResult {
  customer_code: string
  email: string
  id: number
}

export interface DVAResult {
  account_number: string
  account_name: string
  bank: {
    name: string
    slug: string
  }
  customer: {
    customer_code: string
  }
}

export interface PaystackTxn {
  status: string
  amount: number
  reference: string
  paid_at: string
  channel: string
  customer: {
    email: string
    phone: string
  }
}

export interface TransferResult {
  transfer_code: string
  amount: number
  status: string
  transfer_reference: string
}

export interface TransferRecipientResult {
  recipient_code: string
  active: boolean
}

class PaystackService {
  private secretKey: string

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || ''
    if (!this.secretKey) {
      console.warn('PAYSTACK_SECRET_KEY not set')
    }
  }

  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${PAYSTACK_BASE_URL}${endpoint}`
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    }

    if (body && method === 'POST') {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)
    const data = await response.json() as any

    if (!response.ok) {
      const error = new Error(data.message || 'Paystack API error') as PaystackError
      error.statusCode = response.status
      throw error
    }

    return data as T
  }

  /**
   * Create a Paystack customer
   */
  async createCustomer(user: {
    email: string
    full_name: string
    phone: string
  }): Promise<CustomerResult> {
    const nameParts = user.full_name.split(' ')
    const first_name = nameParts[0] || user.full_name
    const last_name = nameParts.slice(1).join(' ') || ''

    const result = await this.request<{ data: CustomerResult }>('POST', '/customer', {
      email: user.email,
      first_name,
      last_name,
      phone: user.phone,
    })

    return result.data
  }

  /**
   * Create a Dedicated Virtual Account (DVA)
   */
  async createDVA(
    customerCode: string,
    user: { full_name: string; email: string }
  ): Promise<DVAResult> {
    const nameParts = user.full_name.split(' ')
    const first_name = nameParts[0] || user.full_name
    const last_name = nameParts.slice(1).join(' ') || ''

    const result = await this.request<{ data: DVAResult }>('POST', '/dedicated_account', {
      customer: customerCode,
      preferred_bank: 'wema-bank',
      first_name,
      last_name,
    })

    return result.data
  }

  /**
   * Verify BVN
   */
  async verifyBVN(bvn: string): Promise<{ verified: boolean; account_name: string | null }> {
    try {
      const result = await this.request<{
        data: { is_verified: boolean; bvn: string; first_name: string; last_name: string }
      }>('GET', `/bank/resolve_bvn/${bvn}`)

      return {
        verified: result.data.is_verified,
        account_name: `${result.data.first_name} ${result.data.last_name}`,
      }
    } catch (error) {
      return { verified: false, account_name: null }
    }
  }

  /**
   * Verify a transaction by reference
   */
  async verifyTransaction(reference: string): Promise<PaystackTxn> {
    const result = await this.request<{ data: PaystackTxn }>('GET', `/transaction/verify/${reference}`)
    return result.data
  }

  /**
   * Resolve NUBAN account
   */
  async resolveAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<{ account_name: string; account_number: string }> {
    const result = await this.request<{
      data: { account_name: string; account_number: string }
    }>('GET', `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`)

    return {
      account_name: result.data.account_name,
      account_number: result.data.account_number,
    }
  }

  /**
   * Create a transfer recipient
   */
  async createTransferRecipient(user: {
    full_name: string
    bank_account_number: string
    bank_code: string
  }): Promise<TransferRecipientResult> {
    const result = await this.request<{ data: TransferRecipientResult }>('POST', '/transferrecipient', {
      type: 'nuban',
      name: user.full_name,
      account_number: user.bank_account_number,
      bank_code: user.bank_code,
      currency: 'NGN',
    })

    return result.data
  }

  /**
   * Initiate a transfer
   */
  async initiateTransfer(
    amountKobo: number,
    recipientCode: string,
    reason: string
  ): Promise<TransferResult> {
    const result = await this.request<{ data: TransferResult }>('POST', '/transfer', {
      source: 'balance',
      amount: amountKobo,
      recipient: recipientCode,
      reason,
      currency: 'NGN',
    })

    return result.data
  }

  /**
   * Finalize a pending transfer (for OTP verification)
   */
  async finalizeTransfer(transferCode: string, otp: string): Promise<{ success: boolean }> {
    const result = await this.request<{ success: boolean }>('POST', `/transfer/finalize_transfer`, {
      transfer_code: transferCode,
      otp,
    })

    return result
  }
}

export const paystackService = new PaystackService()
export default paystackService
