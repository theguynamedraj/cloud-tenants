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

    // Get user's tenant info
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const noteId = pathParts[pathParts.length - 1];

    // Handle POST requests with operation parameter for all CRUD operations
    if (req.method === 'POST') {
      const body = await req.json();
      const operation = body.operation;

      if (operation === 'update') {
        const updateNoteId = body.noteId;
        
        const { data: updatedNote, error: updateError } = await supabase
          .from('notes')
          .update({
            title: body.title,
            content: body.content
          })
          .eq('id', updateNoteId)
          .eq('user_id', user.id)
          .eq('tenant_id', profile.tenant_id)
          .select()
          .single();

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(updatedNote),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (operation === 'delete') {
        const deleteNoteId = body.noteId;
        
        const { error: deleteError } = await supabase
          .from('notes')
          .delete()
          .eq('id', deleteNoteId)
          .eq('user_id', user.id)
          .eq('tenant_id', profile.tenant_id);

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ message: 'Note deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If no operation is specified, it's a create operation
      if (!operation) {
        const { title, content } = body;

        // Check subscription limits
        const { data: tenant } = await supabase
          .from('tenants')
          .select('subscription_plan')
          .eq('id', profile.tenant_id)
          .single();

        if (tenant?.subscription_plan === 'free') {
          const { data: noteCount } = await supabase
            .rpc('get_tenant_note_count', { tenant_uuid: profile.tenant_id });

          if (noteCount >= 3) {
            return new Response(
              JSON.stringify({ error: 'Free plan limited to 3 notes. Upgrade to Pro for unlimited notes.' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        const { data: newNote, error: createError } = await supabase
          .from('notes')
          .insert({
            title,
            content,
            tenant_id: profile.tenant_id,
            user_id: user.id
          })
          .select()
          .single();

        if (createError) {
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(newNote),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    switch (req.method) {
      case 'GET':
        if (noteId && noteId !== 'notes') {
          // Get specific note
          const { data: note, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', noteId)
            .eq('tenant_id', profile.tenant_id)
            .single();

          if (error) {
            return new Response(
              JSON.stringify({ error: 'Note not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify(note),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // List all notes for tenant
          const { data: notes, error } = await supabase
            .from('notes')
            .select('*')
            .eq('tenant_id', profile.tenant_id)
            .order('created_at', { ascending: false });

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify(notes),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }


      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in notes function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});