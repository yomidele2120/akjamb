import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

    // Verify admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, supabaseKey);
    const { data: userData } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (userData?.role !== "admin") throw new Error("Admin only");

    const { file_base64, file_type, subject_id } = await req.json();
    if (!file_base64 || !file_type || !subject_id)
      throw new Error("Missing file_base64, file_type, or subject_id");

    // Get subject name
    const { data: subject } = await adminClient
      .from("subjects")
      .select("name")
      .eq("id", subject_id)
      .single();
    if (!subject) throw new Error("Subject not found");

    // Get existing topics for this subject
    const { data: existingTopics } = await adminClient
      .from("topics")
      .select("id, name")
      .eq("subject_id", subject_id);

    const topicList = (existingTopics ?? []).map((t) => t.name).join(", ");

    // Build content for Gemini
    const prompt = `You are a JAMB CBT question parser. Extract ALL questions from this document for the subject "${subject.name}".

Existing topics for this subject: ${topicList || "None yet - create appropriate topic names"}

For each question, extract:
- question_text: The question
- option_a, option_b, option_c, option_d: The four options
- correct_option: The correct answer letter (A, B, C, or D)
- explanation: Brief explanation of the correct answer
- topic_name: Which topic this question belongs to (use existing topic names when they match, or create a new descriptive topic name)

IMPORTANT:
- If options are labeled 1,2,3,4 convert them to A,B,C,D
- If the correct answer is given as text, match it to the correct option letter
- Detect the topic from the question content
- Return valid JSON only

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_option": "A",
      "explanation": "...",
      "topic_name": "..."
    }
  ]
}`;

    let geminiBody: Record<string, unknown>;

    if (file_type === "pdf") {
      geminiBody = {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: file_base64,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      };
    } else {
      // CSV or text - decode and send as text
      const textContent = atob(file_base64);
      geminiBody = {
        contents: [
          {
            parts: [
              { text: `Document content:\n\n${textContent}\n\n${prompt}` },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      };
    }

    // Retry logic for transient Gemini errors
    let geminiResp: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        }
      );
      if (geminiResp.ok || (geminiResp.status !== 503 && geminiResp.status !== 429)) break;
      console.log(`Gemini returned ${geminiResp.status}, retrying (${attempt + 1}/3)...`);
      await geminiResp.text(); // consume body
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }

    if (!geminiResp!.ok) {
      const errText = await geminiResp!.text();
      console.error("Gemini error:", errText);
      throw new Error("AI processing failed");
    }

    const geminiData = await geminiResp!.json();
    const rawText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: { questions: Array<{
      question_text: string;
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
      correct_option: string;
      explanation: string;
      topic_name: string;
    }> };

    try {
      // Strip markdown fences if present
      let cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", rawText);
      throw new Error("AI returned invalid format");
    }

    if (!parsed.questions?.length)
      throw new Error("No questions extracted from document");

    // Build topic map: create missing topics
    const topicMap = new Map<string, string>();
    for (const t of existingTopics ?? []) {
      topicMap.set(t.name.toLowerCase(), t.id);
    }

    for (const q of parsed.questions) {
      const key = q.topic_name.toLowerCase();
      if (!topicMap.has(key)) {
        const { data: newTopic, error } = await adminClient
          .from("topics")
          .insert({ name: q.topic_name, subject_id })
          .select("id")
          .single();
        if (error) {
          console.error("Topic insert error:", error);
          continue;
        }
        topicMap.set(key, newTopic.id);
      }
    }

    // Normalize correct_option to single letter A-D
    const normalizeOption = (opt: string): string | null => {
      const letter = opt.trim().toUpperCase().replace(/[^A-D]/g, "");
      if (letter.length === 1 && "ABCD".includes(letter)) return letter;
      return null;
    };

    // Insert questions
    const rows = parsed.questions
      .filter((q) => topicMap.has(q.topic_name.toLowerCase()))
      .map((q) => ({
        subject_id,
        topic_id: topicMap.get(q.topic_name.toLowerCase())!,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: normalizeOption(q.correct_option) ?? "A",
        explanation: q.explanation || null,
      }))
      .filter((r) => r.question_text && r.option_a);

    if (!rows.length) throw new Error("No valid questions after processing");

    const { error: insertErr } = await adminClient
      .from("questions")
      .insert(rows);
    if (insertErr) throw new Error("Failed to save questions: " + insertErr.message);

    return new Response(
      JSON.stringify({
        success: true,
        count: rows.length,
        topics_created: parsed.questions
          .map((q) => q.topic_name)
          .filter((v, i, a) => a.indexOf(v) === i).length -
          (existingTopics?.length ?? 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-questions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
