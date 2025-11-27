import {
  PodPayCashInRequest,
  PodPayCashInResponse,
  PodPayCashOutRequest,
  PodPayConfig,
} from '../types';

export class PodPayService {
  private baseUrl: string;
  private publicKey: string;
  private secretKey: string;

  constructor(config: PodPayConfig) {
    this.baseUrl =
      config.environment === 'production'
        ? 'https://api.podpay.com.br'
        : 'https://sandbox.podpay.com.br';
    this.publicKey = config.public_key;
    this.secretKey = config.secret_key;
  }

  private getAuthHeader(): string {
    const credentials = `${this.publicKey}:${this.secretKey}`;
    return `Basic ${btoa(credentials)}`;
  }

  async createCashInTransaction(
    request: PodPayCashInRequest
  ): Promise<PodPayCashInResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create transaction');
      }

      return await response.json();
    } catch (error) {
      console.error('PodPay Cash-In Error:', error);
      throw error;
    }
  }

  async createCashOutTransaction(
    request: PodPayCashOutRequest
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create cash-out');
      }

      return await response.json();
    } catch (error) {
      console.error('PodPay Cash-Out Error:', error);
      throw error;
    }
  }

  async getTransactionStatus(transactionId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/transactions/${transactionId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.getAuthHeader(),
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get transaction status');
      }

      return await response.json();
    } catch (error) {
      console.error('PodPay Get Status Error:', error);
      throw error;
    }
  }
}
