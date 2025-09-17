import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile and check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract tenant slug from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const tenantSlug = pathParts[pathParts.indexOf('tenants') + 1];

    // Verify the tenant slug matches user's tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, slug, subscription_plan')
      .eq('id', profile.tenant_id)
      .single();

    if (!tenant || tenant.slug !== tenantSlug) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upgrade tenant to pro
    const { data: updatedTenant, error: upgradeError } = await supabase
      .from('tenants')
      .update({ subscription_plan: 'pro' })
      .eq('id', profile.tenant_id)
      .select()
      .single();

    if (upgradeError) {
      return new Response(
        JSON.stringify({ error: upgradeError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'Tenant upgraded to Pro successfully',
        tenant: updatedTenant
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upgrade-tenant function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});