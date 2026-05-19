import { streamText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { plannerTools } from "@/lib/agent/planner";
import { SYSTEM_PROMPT } from "@/lib/agent/prompts";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini"),
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
