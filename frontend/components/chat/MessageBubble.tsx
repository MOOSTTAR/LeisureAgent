"use client";

import { motion } from "framer-motion";
import type { UIMessage } from "ai";
import { isStaticToolUIPart, getStaticToolName, isTextUIPart } from "ai";
import { ToolCallCard } from "./ToolCallCard";

interface Props {
  message: UIMessage;
}

function toolStateToStatus(state: string): "running" | "completed" | "failed" {
  if (state === "output-available") return "completed";
  if (state === "output-error" || state === "output-denied") return "failed";
  return "running";
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  const toolParts = message.parts?.filter(isStaticToolUIPart) ?? [];
  const text = message.parts
    ?.filter(isTextUIPart)
    .map((p) => p.text)
    .join("") ?? "";

  return (
    <motion.div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`max-w-[85%] ${isUser ? "order-1" : ""}`}>
        {toolParts.map((part) => (
          <ToolCallCard
            key={part.toolCallId}
            toolCall={{
              id: part.toolCallId,
              name: getStaticToolName(part) as string,
              label: getStaticToolName(part) as string,
              status: toolStateToStatus(part.state),
              result:
                part.state === "output-available" && part.output
                  ? typeof part.output === "string"
                    ? part.output
                    : "完成"
                  : part.state === "output-error"
                  ? part.errorText
                  : undefined,
            }}
          />
        ))}
        {text && (
          <div
            className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              isUser
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                : "bg-muted rounded-2xl rounded-bl-md"
            }`}
          >
            {text}
          </div>
        )}
      </div>
    </motion.div>
  );
}
