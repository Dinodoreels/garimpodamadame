import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROLE_PRIORITY: Record<string, number> = { admin: 4, vendedor: 3, consignador: 2, user: 1 };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);

    // Permission check: caller must be admin or vendedor
    const { data: callerRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId);
    const callerRoleSet = new Set((callerRoles || []).map((r) => r.role));
    if (!callerRoleSet.has('admin') && !callerRoleSet.has('vendedor')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // List all auth users (paginated)
    const allAuthUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const batch = data?.users || [];
      allAuthUsers.push(...batch);
      if (batch.length < perPage) break;
      page += 1;
    }

    const userIds = allAuthUsers.map((u) => u.id);

    // Profiles
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, phone, cpf, birth_date, created_at')
      .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);
    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p) => { profileMap[p.id] = p; });

    // Roles
    const { data: roles } = await admin
      .from('user_roles')
      .select('user_id, role');
    const rolesMap: Record<string, string[]> = {};
    (roles || []).forEach((r: any) => {
      if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
      rolesMap[r.user_id].push(r.role);
    });

    // Order stats (paginated)
    const orderStats: Record<string, { count: number; total: number }> = {};
    let oFrom = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await admin
        .from('orders')
        .select('user_id, total')
        .range(oFrom, oFrom + PAGE - 1);
      if (error) break;
      const batch = data || [];
      batch.forEach((o: any) => {
        if (!o.user_id) return;
        if (!orderStats[o.user_id]) orderStats[o.user_id] = { count: 0, total: 0 };
        orderStats[o.user_id].count += 1;
        orderStats[o.user_id].total += Number(o.total) || 0;
      });
      if (batch.length < PAGE) break;
      oFrom += PAGE;
    }

    const users = allAuthUsers.map((u) => {
      const prof = profileMap[u.id] || {};
      const userRoles = rolesMap[u.id] || [];
      const topRole = userRoles.length
        ? [...userRoles].sort((a, b) => (ROLE_PRIORITY[b] || 0) - (ROLE_PRIORITY[a] || 0))[0]
        : 'user';
      const stats = orderStats[u.id] || { count: 0, total: 0 };
      return {
        id: u.id,
        email: u.email || null,
        full_name: prof.full_name || null,
        phone: prof.phone || null,
        cpf: prof.cpf || null,
        birth_date: prof.birth_date || null,
        created_at: prof.created_at || u.created_at,
        role: topRole,
        orders_count: stats.count,
        total_spent: stats.total,
      };
    });

    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('list-all-users error:', err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});