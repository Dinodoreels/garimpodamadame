import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfilePayload {
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  birth_date?: string | null;
}

interface AddressPayload {
  zip_code: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Não autorizado' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userError } = await userClient.auth.getUser();
    if (userError || !userRes?.user) {
      return jsonResponse({ error: 'Não autorizado' }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: requesterRole } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userRes.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!requesterRole) {
      return jsonResponse({ error: 'Apenas administradores podem cadastrar clientes' }, 403);
    }

    const body = await req.json();
    const profile: ProfilePayload = body?.profile;
    const address: AddressPayload = body?.address;

    if (!profile?.full_name || !profile?.email || !profile?.phone || !profile?.cpf) {
      return jsonResponse({ error: 'Preencha todos os campos obrigatórios do cliente' }, 400);
    }
    if (
      !address?.zip_code ||
      !address?.street ||
      !address?.number ||
      !address?.neighborhood ||
      !address?.city ||
      !address?.state
    ) {
      return jsonResponse({ error: 'Preencha todos os campos obrigatórios do endereço' }, 400);
    }

    const email = profile.email.trim().toLowerCase();

    // Check if email already exists
    const { data: existing, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) {
      console.error('listUsers error:', listErr);
      return jsonResponse({ error: 'Erro ao verificar email' }, 500);
    }
    if (existing.users.some((u: any) => u.email?.toLowerCase() === email)) {
      return jsonResponse({ error: 'Já existe um cliente cadastrado com esse email' }, 409);
    }

    // Determine redirect URL from request origin
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    const redirectTo = origin ? `${origin.replace(/\/+$/, '')}/reset-password` : undefined;

    // Send invite (creates auth.users entry + sends email)
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: profile.full_name,
        phone: profile.phone,
      },
      redirectTo,
    });

    if (inviteErr || !invited?.user) {
      console.error('inviteUserByEmail error:', inviteErr);
      return jsonResponse(
        { error: inviteErr?.message || 'Erro ao enviar convite por email' },
        500
      );
    }

    const newUserId = invited.user.id;

    // Update profile with extra fields (trigger handle_new_user already inserted base row)
    const { error: profileErr } = await admin
      .from('profiles')
      .upsert(
        {
          id: newUserId,
          full_name: profile.full_name,
          phone: profile.phone,
          cpf: profile.cpf,
          birth_date: profile.birth_date || null,
        },
        { onConflict: 'id' }
      );

    if (profileErr) {
      console.error('profile upsert error:', profileErr);
      await admin.auth.admin.deleteUser(newUserId);
      return jsonResponse({ error: 'Erro ao salvar dados do cliente' }, 500);
    }

    // Insert default address
    const { error: addrErr } = await admin.from('addresses').insert({
      user_id: newUserId,
      label: 'Principal',
      recipient_name: profile.full_name,
      zip_code: address.zip_code.replace(/\D/g, ''),
      street: address.street,
      number: address.number,
      complement: address.complement || null,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      is_default: true,
    });

    if (addrErr) {
      console.error('address insert error:', addrErr);
      await admin.auth.admin.deleteUser(newUserId);
      return jsonResponse({ error: 'Erro ao salvar endereço' }, 500);
    }

    return jsonResponse({ success: true, userId: newUserId, email });
  } catch (err) {
    console.error('Unexpected error:', err);
    return jsonResponse({ error: 'Erro inesperado' }, 500);
  }
});