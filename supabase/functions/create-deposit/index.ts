import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateDepositRequest {
  user_id: string;
  amount: number;
  description?: string;
}

interface Acquirer {
  id: string;
  name: string;
  public_key: string;
  secret_key: string;
  environment: string;
  is_active: boolean;
  priority: number;
  weight: number;
}

async function generateQRCodeBase64(text: string): Promise<string> {
  try {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(text)}`;
    const response = await fetch(qrApiUrl);
    
    if (!response.ok) {
      throw new Error('Failed to generate QR code');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return base64;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

async function checkAcquirerLimits(
  supabase: any,
  acquirerId: string,
  amount: number
): Promise<{ valid: boolean; reason?: string }> {
  const { data: limit } = await supabase
    .from('acquirer_transaction_limits')
    .select('*')
    .eq('acquirer_id', acquirerId)
    .eq('transaction_type', 'cash_in')
    .eq('is_active', true)
    .maybeSingle();

  if (!limit) {
    return { valid: true };
  }

  if (amount < parseFloat(limit.min_amount)) {
    return {
      valid: false,
      reason: `Valor mínimo: R$ ${limit.min_amount}`,
    };
  }

  if (limit.max_amount && amount > parseFloat(limit.max_amount)) {
    return {
      valid: false,
      reason: `Valor máximo: R$ ${limit.max_amount}`,
    };
  }

  return { valid: true };
}

async function tryCreateDepositWithAcquirer(
  supabase: any,
  acquirer: Acquirer,
  requestData: CreateDepositRequest,
  userData: any,
  userEmail: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log(`Attempting deposit with acquirer: ${acquirer.name} (priority: ${acquirer.priority})`);

    const limitCheck = await checkAcquirerLimits(supabase, acquirer.id, requestData.amount);
    if (!limitCheck.valid) {
      console.log(`Acquirer ${acquirer.name} limit check failed: ${limitCheck.reason}`);
      return { success: false, error: limitCheck.reason };
    }

    const podpayBaseUrl =
      acquirer.environment === 'production'
        ? 'https://api.podpay.co'
        : 'https://sandbox.podpay.co';

    const credentials = `${acquirer.public_key}:${acquirer.secret_key}`;
    const authBasic = btoa(credentials);
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/podpay-webhook`;
    const amountInCents = Math.round(requestData.amount * 100);

    const podpayPayload = {
      amount: amountInCents,
      paymentMethod: 'pix',
      items: [
        {
          title: requestData.description || `Depósito`,
          unitPrice: amountInCents,
          quantity: 1,
          tangible: false,
        },
      ],
      customer: {
        name: userData.name || 'Cliente',
        email: userData.email || userEmail || 'cliente@example.com',
        document: {
          number: userData.document_cpf_cnpj || '00000000000',
          type:
            userData.document_cpf_cnpj && userData.document_cpf_cnpj.length === 14
              ? 'cnpj'
              : 'cpf',
        },
      },
      postbackUrl: webhookUrl,
    };

    console.log(`Calling ${podpayBaseUrl}/v1/transactions with amount: ${amountInCents} cents`);

    const podpayResponse = await fetch(`${podpayBaseUrl}/v1/transactions`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Basic ${authBasic}`,
      },
      body: JSON.stringify(podpayPayload),
    });

    if (!podpayResponse.ok) {
      const errorText = await podpayResponse.text();
      console.error(`PodPay API Error (${acquirer.name}):`, errorText);

      await supabase
        .from('seller_acquirer_assignments')
        .update({
          last_failure_at: new Date().toISOString(),
          failure_count: supabase.sql`failure_count + 1`,
        })
        .eq('acquirer_id', acquirer.id)
        .eq('user_id', requestData.user_id);

      return {
        success: false,
        error: `Erro na API: ${podpayResponse.status}`,
      };
    }

    const podpayData = await podpayResponse.json();
    console.log(`Success with acquirer ${acquirer.name}:`, podpayData.id);

    let qrCodeBase64 = '';
    if (podpayData.pix?.qrcode) {
      qrCodeBase64 = await generateQRCodeBase64(podpayData.pix.qrcode);
    }

    const expiresAt = podpayData.pix?.expirationDate
      ? new Date(podpayData.pix.expirationDate)
      : new Date(Date.now() + 30 * 60 * 1000);

    const { data: deposit, error: insertError } = await supabase
      .from('deposits')
      .insert({
        user_id: requestData.user_id,
        amount: requestData.amount,
        status: 'pending',
        provider: 'podpay',
        provider_transaction_id: String(podpayData.id),
        acquirer_id: acquirer.id,
        pix_qr_code: podpayData.pix?.qrcode || null,
        pix_qr_code_base64: qrCodeBase64 || null,
        pix_copy_paste: podpayData.pix?.qrcode || null,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving deposit:', insertError);
      return { success: false, error: 'Erro ao salvar depósito' };
    }

    return { success: true, data: deposit };
  } catch (error) {
    console.error(`Error with acquirer ${acquirer.name}:`, error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const requestData: CreateDepositRequest = await req.json();

    if (requestData.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!requestData.amount || requestData.amount < 1) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valor mínimo é R$ 1,00' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: userData } = await supabaseClient
      .from('users')
      .select('kyc_status, name, email, document_cpf_cnpj, account_status, deposits_blocked, deposits_blocked_reason')
      .eq('id', user.id)
      .maybeSingle();

    if (!userData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (userData.account_status && userData.account_status !== 'active') {
      return new Response(
        JSON.stringify({ success: false, error: 'Conta suspensa ou bloqueada. Entre em contato com o suporte.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (userData.deposits_blocked) {
      return new Response(
        JSON.stringify({
          success: false,
          error: userData.deposits_blocked_reason || 'Depósitos bloqueados. Entre em contato com o suporte.'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (userData.kyc_status !== 'approved') {
      return new Response(
        JSON.stringify({ success: false, error: 'KYC precisa estar aprovado' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: assignments } = await supabaseClient
      .from('seller_acquirer_assignments')
      .select(
        'acquirer_id, priority, weight, payment_acquirers(id, name, public_key, secret_key, environment, is_active)'
      )
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .order('weight', { ascending: false });

    if (!assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhuma adquirente configurada. Entre em contato com o suporte.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${assignments.length} acquirers for user ${user.id}`);

    const acquirers: Acquirer[] = assignments
      .map(a => {
        const acq = Array.isArray(a.payment_acquirers)
          ? a.payment_acquirers[0]
          : a.payment_acquirers;
        return acq
          ? {
              ...acq,
              priority: a.priority,
              weight: a.weight,
            }
          : null;
      })
      .filter(a => a && a.is_active) as Acquirer[];

    if (acquirers.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhuma adquirente ativa. Entre em contato com o suporte.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let lastError = '';
    for (const acquirer of acquirers) {
      const result = await tryCreateDepositWithAcquirer(
        supabaseClient,
        acquirer,
        requestData,
        userData,
        user.email
      );

      if (result.success) {
        return new Response(
          JSON.stringify({ success: true, deposit: result.data }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      lastError = result.error || 'Erro desconhecido';
      console.log(`Failed with ${acquirer.name}, trying next acquirer...`);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: `Todas as adquirentes falharam. Último erro: ${lastError}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-deposit function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
