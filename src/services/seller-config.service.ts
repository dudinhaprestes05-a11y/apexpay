import { api } from '../lib/api';
import {
  SellerFees,
  PaymentAcquirer,
  SellerAcquirerAssignment,
  Environment,
} from '../types';
import { PodPayService } from './podpay.service';

export class SellerConfigService {
  static async getSellerAcquirer(
    userId: string
  ): Promise<PaymentAcquirer | null> {
    const { data, error } = await supabase
      .from('seller_acquirer_assignments')
      .select(`
        *,
        acquirer:payment_acquirers(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching seller acquirer:', error);
      return null;
    }

    return data?.acquirer || null;
  }

  static async getSellerFees(userId: string): Promise<SellerFees | null> {
    const { data, error } = await supabase
      .from('seller_fees')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching seller fees:', error);
      return null;
    }

    return data;
  }

  static async getEffectiveConfig(
    userId: string
  ): Promise<{
    publicKey: string;
    secretKey: string;
    environment: Environment;
    webhookUrl?: string;
    acquirerId: string;
  } | null> {
    const acquirer = await this.getSellerAcquirer(userId);

    if (!acquirer || !acquirer.is_active) {
      console.error('No active acquirer assigned to seller');
      return null;
    }

    return {
      publicKey: acquirer.public_key,
      secretKey: acquirer.secret_key,
      environment: acquirer.environment,
      webhookUrl: acquirer.webhook_url,
      acquirerId: acquirer.id,
    };
  }

  static async createPodPayService(
    userId: string
  ): Promise<{ service: PodPayService; acquirerId: string } | null> {
    const config = await this.getEffectiveConfig(userId);

    if (!config) {
      return null;
    }

    const service = new PodPayService({
      id: config.acquirerId,
      public_key: config.publicKey,
      secret_key: config.secretKey,
      environment: config.environment,
      webhook_url: config.webhookUrl,
      is_active: true,
      created_at: '',
      updated_at: '',
    });

    return { service, acquirerId: config.acquirerId };
  }

  static async canProcessTransactions(userId: string): Promise<boolean> {
    const { data: user } = await supabase
      .from('users')
      .select('kyc_status, role')
      .eq('id', userId)
      .maybeSingle();

    if (!user || user.role !== 'seller' || user.kyc_status !== 'approved') {
      return false;
    }

    const acquirer = await this.getSellerAcquirer(userId);
    return acquirer !== null && acquirer.is_active;
  }

  static async assignAcquirer(
    userId: string,
    acquirerId: string,
    assignedBy: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('seller_acquirer_assignments')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('seller_acquirer_assignments')
          .update({ is_active: false })
          .eq('id', existing.id);
      }

      const { error } = await supabase
        .from('seller_acquirer_assignments')
        .insert({
          user_id: userId,
          acquirer_id: acquirerId,
          assigned_by: assignedBy,
          is_active: true,
          notes,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error assigning acquirer:', error);
      return false;
    }
  }

  static async updateSellerFees(
    userId: string,
    fees: Partial<SellerFees>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('seller_fees')
      .upsert({
        user_id: userId,
        ...fees,
      });

    if (error) {
      console.error('Error updating seller fees:', error);
      return false;
    }

    return true;
  }

  static async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<boolean> {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      data: data || {},
    });

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }

    return true;
  }
}
