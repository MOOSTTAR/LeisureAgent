"use client";

import { useEffect, useRef, useState, type UIEvent } from "react";
import { AnimatePresence } from "framer-motion";
import type { UIMessage } from "ai";
import { WelcomeScreen } from "./WelcomeScreen";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface Props {
  messages: UIMessage[];
  isLoading: boolean;
  onSuggestionClick: (text: string) => void;
}

export function MessageList({ messages, isLoading, onSuggestionClick }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);

  const scrollToBottom = () => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
      setUserScrolled(false);
    }
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollButton(distFromBottom > 150);
    if (distFromBottom > 150) setUserScrolled(true);
  };

  useEffect(() => {
    if (!userScrolled) scrollToBottom();
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex-1 h-full">
        <WelcomeScreen onSuggestionClick={onSuggestionClick} />
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <div
        ref={viewportRef}
        className="h-full overflow-auto"
        onScroll={handleScroll}
      >
        <div className="px-4 py-6">
          <AnimatePresence>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
          {isLoading &&
            messages[messages.length - 1]?.role === "user" && (
              <TypingIndicator />
            )}
        </div>
      </div>
      {showScrollButton && (
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-2 right-4 rounded-full shadow-lg z-10"
          onClick={scrollToBottom}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
