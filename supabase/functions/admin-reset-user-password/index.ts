import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validate admin role
    const { data: requesterRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!requesterRole) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem resetar senhas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { targetUserId, mode, newPassword } = await req.json();

    if (!targetUserId || !mode) {
      return new Response(
        JSON.stringify({ error: 'targetUserId e mode são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['send_link', 'set_password'].includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'mode inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user info
    const { data: targetUserData, error: targetError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (targetError || !targetUserData?.user) {
      return new Response(
        JSON.stringify({ error: 'Usuário alvo não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetEmail = targetUserData.user.email;

    if (mode === 'send_link') {
      if (!targetEmail) {
        return new Response(
          JSON.stringify({ error: 'Usuário não tem email cadastrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
      const redirectTo = `${origin}/reset-password`;

      // Use the public client so Supabase Auth actually dispatches the recovery email
      // (admin.generateLink only returns the link, it does NOT send the email).
      const publicClient = createClient(supabaseUrl, supabaseAnonKey);
      const { error: linkError } = await publicClient.auth.resetPasswordForEmail(targetEmail, {
        redirectTo,
      });

      if (linkError) {
        console.error('Error generating recovery link:', linkError);
        const code = (linkError as any)?.code || '';
        let friendly = linkError.message || 'Erro ao enviar link de recuperação';
        if (code === 'over_email_send_rate_limit' || /rate.?limit/i.test(friendly)) {
          friendly = 'Aguarde alguns segundos antes de reenviar o link para este e-mail.';
        }
        return new Response(
          JSON.stringify({ error: friendly }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Audit log
      await supabaseAdmin.from('admin_notifications').insert({
        type: 'password_reset_link',
        title: 'Link de redefinição enviado',
        message: `Admin ${user.email} enviou link de redefinição para ${targetEmail}`,
        metadata: { admin_id: user.id, target_user_id: targetUserId, target_email: targetEmail },
      });

      return new Response(
        JSON.stringify({ success: true, message: `Link de redefinição enviado para ${targetEmail}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // mode === 'set_password'
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Senha deve ter pelo menos 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      const code = (updateError as any)?.code;
      const reasons: string[] = (updateError as any)?.reasons || [];
      let friendly = updateError.message || 'Erro ao atualizar senha';
      if (code === 'weak_password' || reasons.includes('pwned')) {
        friendly = 'Esta senha aparece em vazamentos públicos de dados. Escolha outra mais forte, combinando letras maiúsculas e minúsculas, números e símbolos.';
      } else if (code === 'same_password') {
        friendly = 'A nova senha não pode ser igual à senha atual.';
      }
      return new Response(
        JSON.stringify({ error: friendly }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Audit log
    await supabaseAdmin.from('admin_notifications').insert({
      type: 'password_reset_manual',
      title: 'Senha redefinida manualmente',
      message: `Admin ${user.email} definiu nova senha para ${targetEmail || targetUserId}`,
      metadata: { admin_id: user.id, target_user_id: targetUserId, target_email: targetEmail },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Senha atualizada com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
