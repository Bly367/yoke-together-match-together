// Supabase Edge Function: Generate Embeddings
// This function processes photo and prompt embeddings asynchronously

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1';

interface EmbeddingRequest {
  type: 'photo' | 'prompt';
  id: string;
  url?: string;
  text?: string;
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let requestBody: EmbeddingRequest;
    try {
      requestBody = await req.json() as EmbeddingRequest;
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { type, id, url, text } = requestBody;

    if (!type || !id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (type !== 'photo' && type !== 'prompt') {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Must be "photo" or "prompt"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding based on type
    let embedding: number[];
    
    if (type === 'photo' && url) {
      // Generate visual embedding
      const response = await fetch(`${OPENAI_API_URL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-large',
          input: url, // For now, using text-embedding model
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      embedding = data.data[0].embedding;
    } else if (type === 'prompt' && text) {
      // Generate text embedding
      const response = await fetch(`${OPENAI_API_URL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-large',
          input: text,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      embedding = data.data[0].embedding;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid request: missing url or text' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update database with embedding
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const table = type === 'photo' ? 'user_photos' : 'user_prompts';
    const embeddingColumn = type === 'photo' ? 'visual_embedding' : 'text_embedding';

    const { error: updateError } = await supabaseClient
      .from(table)
      .update({
        [embeddingColumn]: embedding,
        embedding_generated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, id, type }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

