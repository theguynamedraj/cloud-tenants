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
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get tenant IDs
    const { data: tenants } = await supabaseServiceRole
      .from('tenants')
      .select('id, slug');

    const acmeTenant = tenants?.find(t => t.slug === 'acme');
    const globexTenant = tenants?.find(t => t.slug === 'globex');

    if (!acmeTenant || !globexTenant) {
      return new Response(
        JSON.stringify({ error: 'Tenants not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create test users
    const testUsers = [
      { email: 'admin@acme.test', password: 'password', tenant_id: acmeTenant.id, role: 'admin' },
      { email: 'user@acme.test', password: 'password', tenant_id: acmeTenant.id, role: 'member' },
      { email: 'admin@globex.test', password: 'password', tenant_id: globexTenant.id, role: 'admin' },
      { email: 'user@globex.test', password: 'password', tenant_id: globexTenant.id, role: 'member' },
    ];

    const results = [];

    for (const testUser of testUsers) {
      // Create auth user
      const { data: authUser, error: authError } = await supabaseServiceRole.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true,
      });

      if (authError) {
        console.error(`Error creating user ${testUser.email}:`, authError);
        results.push({ email: testUser.email, error: authError.message });
        continue;
      }

      // Create profile
      const { error: profileError } = await supabaseServiceRole
        .from('profiles')
        .insert({
          user_id: authUser.user.id,
          tenant_id: testUser.tenant_id,
          email: testUser.email,
          role: testUser.role,
        });

      if (profileError) {
        console.error(`Error creating profile for ${testUser.email}:`, profileError);
        results.push({ email: testUser.email, error: profileError.message });
      } else {
        results.push({ email: testUser.email, success: true });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Test users seeded',
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in seed-test-users function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});