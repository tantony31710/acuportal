import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3"

serve(async (req) => {
  const { prompt } = await req.json()
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  // 1. Generate embedding for query
  const configuration = new Configuration({ apiKey: Deno.env.get("OPENAI_API_KEY") })
  const openai = new OpenAIApi(configuration)
  const embeddingResponse = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: prompt,
  })
  const embedding = embeddingResponse.data.data[0].embedding

  // 2. Query similar contexts
  const { data: documents } = await supabase.rpc("match_attendance", {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 5,
  })

  // 3. Generate answer (simplified for brevity)
  return new Response(JSON.stringify({ answer: "Insights based on retrieved context..." }), { headers: { "Content-Type": "application/json" } })
})
