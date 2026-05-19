"use client";

import { motion } from "framer-motion";
import { Compass } from "lucide-react";

interface Props {
  onSuggestionClick: (text: string) => void;
}

const suggestions = [
  "今天下午是空的，想和老婆孩子出去玩几个小时，别离家太远，帮我安排一下。",
  "周末想找个安静的地方看书喝咖啡，附近有什么推荐吗？",
  "晚上和朋友聚餐，4个人，想吃火锅，帮我安排一下。",
];

export function WelcomeScreen({ onSuggestionClick }: Props) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 120, damping: 14 }}
        className="text-5xl mb-6"
      >
        <Compass className="w-12 h-12 text-primary/70" strokeWidth={1.5} />
      </motion.div>
      <motion.h1
        className="text-2xl font-bold mb-2"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 100, damping: 16 }}
      >
        周末去哪儿？
      </motion.h1>
      <motion.p
        className="text-muted-foreground mb-8 text-sm"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 18 }}
      >
        告诉我你的时间和偏好，我来帮你安排
      </motion.p>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {suggestions.map((text, i) => (
          <motion.button
            key={i}
            className="px-4 py-3 text-sm text-left rounded-xl border bg-card hover:bg-accent transition-colors"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.1, type: "spring", stiffness: 120, damping: 18 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSuggestionClick(text)}
          >
            {text}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
