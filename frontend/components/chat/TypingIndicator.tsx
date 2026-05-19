"use client";

import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-3 mr-auto max-w-[80%]"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-muted">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-typing-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">小Leisure 正在思考...</span>
    </motion.div>
  );
}
