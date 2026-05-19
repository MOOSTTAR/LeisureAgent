"use client";

import { useEffect } from "react";
import type { UIMessage } from "ai";
import { isStaticToolUIPart, getStaticToolName } from "ai";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import type { Plan } from "@/lib/types";
import { useApp } from "@/lib/store/AppContext";

interface Props {
  messages: UIMessage[];
  input: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  onSuggestionClick: (text: string) => void;
}

function toolStateToStatus(state: string): "running" | "completed" | "failed" {
  if (state === "output-available") return "completed";
  if (state === "output-error" || state === "output-denied") return "failed";
  return "running";
}

export function ChatPanel({
  messages,
  input,
  isLoading,
  onInputChange,
  onSubmit,
  onStop,
  onSuggestionClick,
}: Props) {
  const { dispatch } = useApp();

  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      if (!msg.parts) continue;
      for (const part of msg.parts) {
        if (
          isStaticToolUIPart(part) &&
          getStaticToolName(part) === "presentPlan" &&
          part.state === "output-available"
        ) {
          const plan = part.output as Plan;
          if (plan && plan.activities) {
            dispatch({ type: "SET_PLAN", plan });
          }
        }
      }
    }

    const toolCalls: {
      id: string;
      name: string;
      label: string;
      status: "running" | "completed" | "failed";
      result?: string;
    }[] = [];
    for (const msg of messages) {
      if (!msg.parts) continue;
      for (const part of msg.parts) {
        if (isStaticToolUIPart(part)) {
          const toolName = getStaticToolName(part) as string;
          toolCalls.push({
            id: part.toolCallId,
            name: toolName,
            label: toolName,
            status: toolStateToStatus(part.state),
            result:
              part.state === "output-available" && part.output
                ? typeof part.output === "string"
                  ? part.output.slice(0, 50)
                  : "完成"
                : part.state === "output-error"
                ? part.errorText
                : undefined,
          });
        }
      }
    }
    dispatch({ type: "SET_ACTIVE_TOOL_CALLS", toolCalls });
  }, [messages, dispatch]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
        <div>
          <h2 className="text-sm font-semibold">LeisureAgent</h2>
          <p className="text-xs text-muted-foreground">周末活动智能规划</p>
        </div>
      </header>

      <MessageList
        messages={messages}
        isLoading={isLoading}
        onSuggestionClick={onSuggestionClick}
      />

      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        onStop={onStop}
      />
    </div>
  );
}
