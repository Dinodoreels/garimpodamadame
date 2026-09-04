import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Client with user token for auth verification
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Not admin:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get customer ID from request
    const { customerId } = await req.json();
    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Customer ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching details for customer:', customerId);

    // Service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch profile data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', customerId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch email from auth.users using admin API
    let email = null;
    try {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(customerId);
      if (!userError && userData?.user) {
        email = userData.user.email;
      }
      console.log('User email fetched:', email ? 'found' : 'not found');
    } catch (e) {
      console.error('Error fetching user email:', e);
    }

    // Fetch addresses
    const { data: addresses, error: addressesError } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('user_id', customerId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (addressesError) {
      console.error('Addresses error:', addressesError);
    }

    // Fetch order statistics
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, total, created_at, status')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Orders error:', ordersError);
    }

    // Fetch user role (get all and resolve by priority)
    const { data: userRoles, error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', customerId);

    if (userRoleError) {
      console.error('Role error:', userRoleError);
    }

    const completedOrders = orders?.filter(o => ['paid', 'shipped', 'delivered'].includes(o.status)) || [];
    const ordersCount = completedOrders.length;
    const totalSpent = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const lastOrder = orders?.[0] || null;

    // Resolve role by priority: admin > vendedor > user
    const rolePriority: Record<string, number> = { admin: 3, vendedor: 2, user: 1 };
    let resolvedRole = 'user';
    if (userRoles && userRoles.length > 0) {
      const sorted = userRoles.sort((a: any, b: any) => (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0));
      resolvedRole = sorted[0].role || 'user';
    }

    // Fetch seller stats if user is vendedor or admin
    let sellerStats: any = null;
    if (resolvedRole === 'vendedor' || resolvedRole === 'admin') {
      const { data: salesData, error: salesError } = await supabaseAdmin
        .from('orders')
        .select('id, total, created_at, status')
        .eq('created_by', customerId)
        .in('status', ['paid', 'shipped', 'delivered'])
        .order('created_at', { ascending: false });

      if (salesError) {
        console.error('Sales error:', salesError);
      }

      const sales = salesData || [];
      const totalOrders = sales.length;
      const totalRevenue = sales.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthSales = sales.filter(s => new Date(s.created_at) >= startOfMonth);
      const monthOrders = monthSales.length;
      const monthRevenue = monthSales.reduce((sum, o) => sum + Number(o.total || 0), 0);

      const lastSale = sales[0] || null;

      sellerStats = {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        avg_ticket: avgTicket,
        month_orders: monthOrders,
        month_revenue: monthRevenue,
        last_sale: lastSale ? {
          id: lastSale.id,
          total: Number(lastSale.total),
          created_at: lastSale.created_at,
        } : null,
      };
    }

    const response = {
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        cpf: profile.cpf,
        birth_date: profile.birth_date,
        created_at: profile.created_at,
      },
      email,
      addresses: addresses || [],
      stats: {
        orders_count: ordersCount,
        total_spent: totalSpent,
        last_order: lastOrder ? {
          id: lastOrder.id,
          total: lastOrder.total,
          created_at: lastOrder.created_at,
          status: lastOrder.status,
        } : null,
      },
      role: resolvedRole,
      seller_stats: sellerStats,
    };

    console.log('Customer details fetched successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
