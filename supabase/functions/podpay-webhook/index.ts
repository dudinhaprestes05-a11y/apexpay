import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PodPayWebhookPayload {
  type?: string;
  event?: string;
  objectId?: string | number;
  data?: {
    id?: string | number;
    status?: string;
    amount?: number;
    paidAmount?: number;
    paidAt?: string;
    pix?: {
      end2EndId?: string;
    };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: PodPayWebhookPayload = await req.json();

    console.log('PodPay Webhook received:', JSON.stringify(payload, null, 2));

    const eventType = payload.event || payload.type || 'unknown';
    const transactionId = payload.data?.id?.toString() || payload.objectId?.toString();

    await supabase.from('webhook_logs').insert([
      {
        provider: 'podpay',
        event_type: eventType,
        transaction_id: transactionId,
        payload_json: payload,
        http_status: 200,
      },
    ]);

    if (!transactionId) {
      console.log('No transaction ID found in webhook payload');
      return createSuccessResponse('Webhook received but no transaction ID');
    }

    const eventStatus = payload.data?.status?.toLowerCase();
    console.log(`Processing webhook for transaction ${transactionId} with status: ${eventStatus}`);

    const { data: transaction } = await supabase
      .from('transactions')
      .select('id, user_id, amount, net_amount, fee_amount, type, status')
      .eq('provider_transaction_id', transactionId)
      .maybeSingle();

    const { data: deposit } = await supabase
      .from('deposits')
      .select('id, user_id, amount, status')
      .eq('provider_transaction_id', transactionId)
      .maybeSingle();

    if (transaction) {
      switch (eventStatus) {
        case 'paid':
          await handleTransactionPaid(supabase, transaction, payload);
          break;

        case 'refused':
        case 'rejected':
          await handleTransactionRefused(supabase, transaction);
          break;

        case 'cancelled':
        case 'canceled':
          await handleTransactionCancelled(supabase, transaction);
          break;

        case 'refunded':
          await handleTransactionRefunded(supabase, transaction);
          break;

        case 'waiting_payment':
        case 'pending':
          console.log('Transaction still waiting for payment');
          break;

        default:
          console.log(`Unknown transaction status: ${eventStatus}`);
      }
    } else if (deposit) {
      switch (eventStatus) {
        case 'paid':
          await handleDepositPaid(supabase, deposit, payload);
          break;

        case 'expired':
        case 'cancelled':
        case 'canceled':
          await handleDepositCancelled(supabase, deposit);
          break;

        case 'waiting_payment':
        case 'pending':
          console.log('Deposit still waiting for payment');
          break;

        default:
          console.log(`Unknown deposit status: ${eventStatus}`);
      }
    } else {
      console.log(`Neither transaction nor deposit found for provider ID: ${transactionId}`);
      return createSuccessResponse('Transaction/Deposit not found');
    }

    return createSuccessResponse('Webhook processed successfully');

  } catch (error) {
    console.error('Webhook error:', error);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function handleTransactionPaid(supabase: any, transaction: any, payload: PodPayWebhookPayload) {
  console.log(`Processing PAID transaction: ${transaction.id}`);

  if (transaction.status === 'paid') {
    console.log('Transaction already marked as paid, skipping');
    return;
  }

  await supabase
    .from('transactions')
    .update({
      status: 'paid',
      end_to_end_id: payload.data?.pix?.end2EndId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transaction.id);

  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance, total_fees_paid')
    .eq('user_id', transaction.user_id)
    .maybeSingle();

  if (wallet) {
    const amountToCredit = transaction.net_amount > 0
      ? parseFloat(transaction.net_amount.toString())
      : parseFloat(transaction.amount.toString());

    const newBalance = parseFloat(wallet.balance.toString()) + amountToCredit;
    const newTotalFees = parseFloat(wallet.total_fees_paid.toString()) + parseFloat(transaction.fee_amount.toString());

    await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        total_fees_paid: newTotalFees
      })
      .eq('user_id', transaction.user_id);

    console.log(`Credited ${amountToCredit} to wallet. New balance: ${newBalance}`);

    await supabase.from('notifications').insert({
      user_id: transaction.user_id,
      type: 'transaction_paid',
      title: 'Pagamento Confirmado',
      message: `Transação de R$ ${transaction.amount.toFixed(2)} foi paga. Saldo creditado: R$ ${amountToCredit.toFixed(2)}`,
      data: { transaction_id: transaction.id },
    });
  }
}

async function handleTransactionRefused(supabase: any, transaction: any) {
  console.log(`Processing REFUSED transaction: ${transaction.id}`);

  await supabase
    .from('transactions')
    .update({
      status: 'refused',
      updated_at: new Date().toISOString(),
    })
    .eq('id', transaction.id);

  await supabase.from('notifications').insert({
    user_id: transaction.user_id,
    type: 'transaction_paid',
    title: 'Transação Recusada',
    message: `Transação de R$ ${transaction.amount.toFixed(2)} foi recusada.`,
    data: { transaction_id: transaction.id },
  });

  console.log('Transaction marked as refused');
}

async function handleTransactionCancelled(supabase: any, transaction: any) {
  console.log(`Processing CANCELLED transaction: ${transaction.id}`);

  await supabase
    .from('transactions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', transaction.id);

  await supabase.from('notifications').insert({
    user_id: transaction.user_id,
    type: 'transaction_paid',
    title: 'Transação Cancelada',
    message: `Transação de R$ ${transaction.amount.toFixed(2)} foi cancelada.`,
    data: { transaction_id: transaction.id },
  });

  console.log('Transaction marked as cancelled');
}

async function handleTransactionRefunded(supabase: any, transaction: any) {
  console.log(`Processing REFUNDED transaction: ${transaction.id}`);

  if (transaction.status === 'paid') {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance, frozen_balance')
      .eq('user_id', transaction.user_id)
      .maybeSingle();

    if (wallet) {
      const amountToDebit = transaction.net_amount > 0
        ? parseFloat(transaction.net_amount.toString())
        : parseFloat(transaction.amount.toString());

      const newBalance = parseFloat(wallet.balance.toString()) - amountToDebit;
      const newFrozenBalance = parseFloat(wallet.frozen_balance.toString()) + amountToDebit;

      await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          frozen_balance: newFrozenBalance
        })
        .eq('user_id', transaction.user_id);

      console.log(`Debited ${amountToDebit} from wallet and froze it`);
    }
  }

  await supabase
    .from('transactions')
    .update({
      status: 'refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', transaction.id);

  await supabase.from('notifications').insert({
    user_id: transaction.user_id,
    type: 'transaction_paid',
    title: 'Transação Estornada',
    message: `Transação de R$ ${transaction.amount.toFixed(2)} foi estornada. O valor foi debitado do seu saldo.`,
    data: { transaction_id: transaction.id },
  });

  console.log('Transaction marked as refunded');
}

async function handleDepositPaid(supabase: any, deposit: any, payload: PodPayWebhookPayload) {
  console.log(`Processing PAID deposit: ${deposit.id}`);

  if (deposit.status === 'paid') {
    console.log('Deposit already marked as paid, skipping');
    return;
  }

  await supabase
    .from('deposits')
    .update({
      status: 'paid',
      paid_at: payload.data?.paidAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', deposit.id);

  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', deposit.user_id)
    .maybeSingle();

  if (wallet) {
    const newBalance = parseFloat(wallet.balance.toString()) + parseFloat(deposit.amount.toString());

    await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('user_id', deposit.user_id);

    console.log(`Credited ${deposit.amount} to wallet. New balance: ${newBalance}`);

    await supabase.from('notifications').insert({
      user_id: deposit.user_id,
      type: 'deposit_confirmed',
      title: 'Depósito Confirmado',
      message: `Seu depósito de R$ ${parseFloat(deposit.amount).toFixed(2)} foi confirmado e creditado na sua carteira.`,
      data: { deposit_id: deposit.id },
    });
  }
}

async function handleDepositCancelled(supabase: any, deposit: any) {
  console.log(`Processing CANCELLED/EXPIRED deposit: ${deposit.id}`);

  await supabase
    .from('deposits')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('id', deposit.id);

  console.log('Deposit marked as expired');
}

function createSuccessResponse(message: string) {
  return new Response(
    JSON.stringify({ success: true, message }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}
