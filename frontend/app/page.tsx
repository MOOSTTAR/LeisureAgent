"use client";

import { useState } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PlanPanel } from "@/components/plan/PlanPanel";

export default function HomePage() {
  const [input, setInput] = useState("");

  const {
    messages,
    sendMessage,
    status,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input.trim() });
      setInput("");
    }
  };

  const handleSuggestionClick = (text: string) => {
    sendMessage({ text });
  };

  return (
    <main className="relative h-dvh overflow-hidden bg-background">
      <ChatPanel
        messages={messages}
        input={input}
        isLoading={isLoading}
        onInputChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
        onStop={stop}
        onSuggestionClick={handleSuggestionClick}
      />
      <PlanPanel />
    </main>
  );
}
