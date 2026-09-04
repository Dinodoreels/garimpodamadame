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

    const requesterId = user.id;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: requesterRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requesterId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!requesterRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { customerId, email, role, storeId, storeRole } = await req.json();
    
    let targetUserId = customerId;

    if (!targetUserId && email) {
      const { data: userData, error: lookupError } = await supabaseAdmin.auth.admin.listUsers();
      if (lookupError) {
        return new Response(
          JSON.stringify({ error: 'Failed to look up users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const found = userData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found) {
        return new Response(
          JSON.stringify({ error: 'Usuário não encontrado com esse email. Ele precisa estar cadastrado no sistema.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      targetUserId = found.id;
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Customer ID or email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles = ['admin', 'vendedor', 'user'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be admin, vendedor, or user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Changing role for user:', targetUserId, 'to:', role, 'storeId:', storeId, 'storeRole:', storeRole);

    // Step 1: Delete all existing roles for this user
    const { error: deleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', targetUserId);

    if (deleteError) {
      console.error('Error deleting existing roles:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to clear existing roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: If role is 'user', remove from store_employees too
    if (role === 'user') {
      await supabaseAdmin
        .from('store_employees')
        .delete()
        .eq('user_id', targetUserId);

      return new Response(
        JSON.stringify({ success: true, message: 'Role set to user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Insert the new role
    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: targetUserId, role });

    if (insertError) {
      console.error('Error inserting role:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to set role to ${role}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: If vendedor with store info, update store_employees
    if (role === 'vendedor' && storeId && storeRole) {
      // Remove old store assignments
      await supabaseAdmin
        .from('store_employees')
        .delete()
        .eq('user_id', targetUserId);

      const { error: storeError } = await supabaseAdmin
        .from('store_employees')
        .insert({
          store_id: storeId,
          user_id: targetUserId,
          role: storeRole,
          is_active: true,
        });

      if (storeError) {
        console.error('Error linking to store:', storeError);
        return new Response(
          JSON.stringify({ error: 'Cargo atualizado, mas erro ao vincular à loja' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Role updated successfully to:', role);
    return new Response(
      JSON.stringify({ success: true, message: `Role updated to ${role}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
