import { streamText, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { plannerTools } from "@/lib/agent/planner";
import { SYSTEM_PROMPT } from "@/lib/agent/prompts";

const provider = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: provider.chat(process.env.OPENAI_MODEL || "deepseek-v4-flash"),
      system: SYSTEM_PROMPT,
      messages,
      tools: plannerTools,
      stopWhen: stepCountIs(8),
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "AI 服务暂时不可用，请稍后重试" },
      { status: 500 }
    );
  }
}
