/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { User, Sparkles } from "lucide-react";
import { ChatMessage, ActionButton } from "../types";
import { motion } from "motion/react";

interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onActionClick: (actionKey: string) => void;
}

export default function ChatView({ messages, isLoading, onActionClick }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Special text styling parser
  const renderMessageContent = (text: string) => {
    const paragraphs = text.split("\n\n");
    return paragraphs.map((para, idx) => {
      // Determine if a paragraph starts with a special emoji
      let styleClass = "text-[#4C3E31] leading-relaxed text-sm md:text-[15px] font-medium";
      let wrapperClass = "mb-4";

      if (para.startsWith("🌾") || para.includes("**Detection Summary**")) {
        wrapperClass = "mb-4 bg-[#EAF2ED]/90 border-l-4 border-[#3E7250] p-4 rounded-r-xl shadow-xs";
      } else if (para.startsWith("📋") || para.includes("**Treatment Plan")) {
        wrapperClass = "mb-4 bg-[#EFF5F9]/90 border-l-4 border-[#4A8EB3] p-4 rounded-r-xl shadow-xs";
      } else if (para.startsWith("⚡") || para.includes("**Action Ready**") || para.includes("**Actions Ready**")) {
        wrapperClass = "mb-4 bg-[#FDF3EB]/90 border-l-4 border-[#D0743B] p-4 rounded-r-xl shadow-xs font-semibold";
      } else if (para.startsWith("💰") || para.includes("**Cost Estimate")) {
        wrapperClass = "mb-4 bg-[#EAF2ED]/95 border-l-4 border-[#438A5E] p-4 rounded-r-xl shadow-xs";
      } else if (para.startsWith("✅") || para.includes("**Compliance**")) {
        wrapperClass = "mb-4 bg-[#F5F2EC]/90 border-l-4 border-[#C4B4A3] p-4 rounded-r-xl shadow-xs";
      } else if (para.startsWith("🌤️") || para.includes("**Weather")) {
        wrapperClass = "mb-4 bg-[#FDF7E7]/90 border-l-4 border-[#CEA035] p-4 rounded-r-xl shadow-xs";
      }

      // Convert double asterisks to bold elements
      const parts = para.split(/\*\*([^*]+)\*\*/g);
      const parsedElements = parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="text-[#2C2219] font-bold">{part}</strong>;
        }
        return part;
      });

      return (
        <div key={idx} className={wrapperClass}>
          <p className={styleClass}>{parsedElements}</p>
        </div>
      );
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-[12%] lg:px-[18%] py-6 space-y-6 pt-16 md:pt-20 pb-32">
      {messages.map((msg) => {
        const isAgent = msg.sender === "agent";
        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex gap-4 group hover:bg-[#FAF6F0] p-3 rounded-2xl transition-all border border-transparent hover:border-[#E9DFD3] hover:shadow-xs"
          >
            {/* Avatar Circle */}
            {isAgent ? (
              <div className="w-9 h-9 rounded-full bg-[#E9F0EB] md:w-9 md:h-9 flex-shrink-0 flex items-center justify-center border border-[#3E7250]">
                <span className="text-sm">🌾</span>
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#EAE3D8] md:w-9 md:h-9 flex-shrink-0 flex items-center justify-center border border-[#D6C5B3]">
                <User className="w-4 h-4 text-[#635547]" />
              </div>
            )}

            {/* Content info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-sm font-bold text-[#2C2219] tracking-tight">
                  {isAgent ? "FarmMind AI" : "You"}
                </span>
                <span className="text-xs text-[#8C7D6E] font-mono">{msg.timestamp}</span>
              </div>

              {/* Parsed message text */}
              <div className="text-[#4C3E31] selection:bg-[#3E7250]/20">
                {renderMessageContent(msg.text)}
               </div>

              {/* Custom action buttons */}
              {isAgent && msg.actionButtons && msg.actionButtons.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3.5">
                  {msg.actionButtons.map((btn, i) => (
                    <button
                      key={i}
                      onClick={() => onActionClick(btn.actionKey)}
                      className="bg-[#EAF2ED] hover:bg-[#D3E5DB] hover:text-[#1E3A24] border border-[#C5D9CC] text-[#2E5A3E] rounded-xl px-3.5 py-1.5 text-xs md:text-sm font-bold transition-all duration-150 inline-flex items-center gap-1.5 shadow-xs"
                    >
                      {btn.label.startsWith("🚁") && <Sparkles className="w-3.5 h-3.5" />}
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Loading state message bubble */}
      {isLoading && (
        <div className="flex gap-4 p-2.5">
          <div className="w-9 h-9 rounded-full bg-[#E9F0EB] flex-shrink-0 flex items-center justify-center border border-[#3E7250]">
            <span className="text-sm">🌾</span>
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-sm font-bold text-[#2C2219]">FarmMind AI</span>
              <span className="text-xs text-[#8C7D6E] font-mono">Analyzing...</span>
            </div>
            {/* 3 Bouncing Dots */}
            <div className="flex items-center gap-1.5 py-2.5">
              <span className="w-2 h-2 bg-[#3E7250] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-2 h-2 bg-[#3E7250] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-2 h-2 bg-[#3E7250] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
          </div>
        </div>
      )}

      {/* Anchor for scroll */}
      <div ref={scrollRef} />
    </div>
  );
}
