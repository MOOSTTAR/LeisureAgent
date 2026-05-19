"use client";

import { useRef, useCallback, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Square } from "lucide-react";

interface Props {
  input: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  onStop,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !isLoading) onSubmit(e);
      }
    },
    [input, isLoading, onSubmit]
  );

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, []);

  return (
    <form
      onSubmit={onSubmit}
      className="sticky bottom-0 p-3 bg-background border-t"
    >
      <div className="flex items-end gap-2 max-w-2xl mx-auto">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            onInputChange(e);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isLoading ? "小Leisure 正在规划中..." : "描述你的出行需求..."
          }
          disabled={isLoading}
          rows={1}
          className="min-h-[44px] max-h-[120px] resize-none rounded-xl text-sm"
        />
        {isLoading ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="shrink-0 rounded-xl"
            onClick={onStop}
          >
            <Square className="w-4 h-4" fill="currentColor" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="shrink-0 rounded-xl"
            disabled={!input.trim()}
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
