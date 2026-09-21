import { requireInternalOrAdmin } from '../_shared/internal-auth.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const access = await requireInternalOrAdmin(req)
  if (access instanceof Response) return new Response(access.body, { status: access.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get loyalty settings
    const { data: settings, error: settingsError } = await supabase
      .from('loyalty_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: 'No settings found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (!settings.is_active || !settings.expiration_enabled) {
      return new Response(JSON.stringify({ message: 'Expiration disabled', expired: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const months = settings.expiration_months || 6;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    // Find users with balance > 0 and last_activity_at before cutoff
    const { data: expiredBalances, error: fetchError } = await supabase
      .from('loyalty_points')
      .select('id, user_id, balance')
      .gt('balance', 0)
      .lt('last_activity_at', cutoffDate.toISOString());

    if (fetchError) {
      console.error('Error fetching expired balances:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!expiredBalances || expiredBalances.length === 0) {
      return new Response(JSON.stringify({ message: 'No points to expire', expired: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let expiredCount = 0;

    for (const record of expiredBalances) {
      // Create expire transaction
      const { error: txError } = await supabase
        .from('loyalty_transactions')
        .insert({
          user_id: record.user_id,
          type: 'expire',
          points: -record.balance,
          description: `Pontos expirados por ${months} meses de inatividade`,
        });

      if (txError) {
        console.error(`Error creating expire transaction for ${record.user_id}:`, txError);
        continue;
      }

      // Zero out balance
      const { error: updateError } = await supabase
        .from('loyalty_points')
        .update({ balance: 0, updated_at: new Date().toISOString() })
        .eq('id', record.id);

      if (updateError) {
        console.error(`Error zeroing balance for ${record.user_id}:`, updateError);
        continue;
      }

      expiredCount++;
    }

    return new Response(JSON.stringify({ message: 'Expiration complete', expired: expiredCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in expire-loyalty-points:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
