/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { ChatMessage } from "../types";

export default function HomeView() {
  const features = [
    {
      icon: "🛰️",
      title: "Field Monitoring",
      description: "Real-time satellite & drone imagery analysis mapping crop vigor."
    },
    {
      icon: "🎯",
      title: "Precision Treatment",
      description: "Targeted weed & pest control with up to 90% herbicide reduction."
    },
    {
      icon: "📈",
      title: "Seasonal Learning",
      description: "Adaptive AI agronomy recommendations that improve each season."
    }
  ];

  return (
    <div className="flex-1 max-w-[800px] mx-auto pt-4 md:pt-10 pb-12 px-4 md:px-6 flex flex-col justify-start items-center text-center">
      {/* Title block with fade-in */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-4xl">🌾</span>
        <h1 className="text-3xl md:text-[42px] font-bold text-[#2C2219] tracking-tight leading-tight mt-4">
          Where precision farming begins
        </h1>
        <p className="text-[#635547] text-sm md:text-[16px] max-w-[560px] mx-auto mt-3 font-medium">
          Autonomous AI agent for weed detection, treatment planning, and organic farm optimization
        </p>
      </motion.div>

      {/* Feature cards row */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10 w-full text-left"
      >
        {features.map((feat, index) => (
          <div
            key={index}
            className="bg-white/80 backdrop-blur-md border border-[#E9DFD3] rounded-2xl p-6 hover:border-[#3E7250]/40 hover:bg-white transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden shadow-[0_4px_20px_rgba(100,80,60,0.03)]"
          >
            {/* Corner Highlight */}
            {index !== 2 && (
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-[#3E7250]/5 to-transparent pointer-events-none group-hover:from-[#3E7250]/15 transition-all duration-300" />
            )}
            
            <div className="w-10 h-10 rounded-xl bg-[#FAF6F0] flex items-center justify-center text-xl mb-4 border border-[#E6DCCF] group-hover:border-[#3E7250]/20 group-hover:bg-[#E9F0EB] transition-colors duration-300 animate-pulse">
              {feat.icon}
            </div>
            
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-[#2C2219] text-sm md:text-[15px] font-bold tracking-tight">
                {feat.title}
              </h3>
              <span className="w-1.5 h-1.5 rounded-full bg-[#3E7250]/30 group-hover:bg-[#3E7250] transition-colors duration-300" />
            </div>
            
            <p className="text-[#635547] text-xs md:text-[13px] leading-relaxed group-hover:text-[#2C2219] transition-colors duration-300 font-medium">
              {feat.description}
            </p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
