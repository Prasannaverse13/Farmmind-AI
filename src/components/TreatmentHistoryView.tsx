/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { TreatmentHistoryItem } from "../types";
import { ArrowUpDown, Filter, Sparkles, AlertCircle, FileSpreadsheet, Eye } from "lucide-react";
import { motion } from "motion/react";

interface TreatmentHistoryViewProps {
  treatments: TreatmentHistoryItem[];
  onAddTreatment?: (item: TreatmentHistoryItem) => void;
}

export default function TreatmentHistoryView({ treatments }: TreatmentHistoryViewProps) {
  const [selectedField, setSelectedField] = useState<string>("All Fields");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("Last 30 Days");
  const [selectedType, setSelectedType] = useState<string>("All Types");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Lists of distinct values for filter dropdowns
  const uniqueFields = useMemo(() => {
    const fields = new Set(treatments.map((t) => t.fieldName));
    return ["All Fields", ...Array.from(fields)];
  }, [treatments]);

  const uniqueTypes = useMemo(() => {
    return ["All Types", "Bio-herbicide", "Organic pest", "Nutrient Foliar"];
  }, []);

  // Filter list of treatments
  const filteredTreatments = useMemo(() => {
    return treatments.filter((t) => {
      // Field filter
      if (selectedField !== "All Fields" && t.fieldName !== selectedField) {
        return false;
      }
      // Type/classification filter
      if (selectedType !== "All Types") {
        const typeNormalized = (t.type || "").toLowerCase();
        const selectedTypeNormalized = (selectedType || "").toLowerCase();
        if (!typeNormalized.includes(selectedTypeNormalized)) return false;
      }
      return true;
    });
  }, [treatments, selectedField, selectedType]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto py-8 md:py-12 px-4 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#2C2219] tracking-tight">
          Treatment History
        </h2>
        <p className="text-sm text-[#635547] mt-1 font-semibold">
          Complete seasonal history of autonomous drone application logs
        </p>
      </div>

      {/* Summary Bar - 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-md border border-[#E9DFD3] rounded-2xl p-5 shadow-xs">
          <span className="block text-xs font-mono font-bold text-[#8C7D6E] uppercase tracking-wider">Completed Deliveries</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-bold text-[#2C2219]">24 Treatments</span>
          </div>
          <p className="text-xs text-[#635547] mt-1.5 font-semibold">Recorded this growing season</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-[#E9DFD3] rounded-2xl p-5 shadow-xs">
          <span className="block text-xs font-mono font-bold text-[#8C7D6E] uppercase tracking-wider">Aggregate Cost Efficiency</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-bold text-[#2E5A3E]">$1,240 Saved</span>
          </div>
          <p className="text-xs text-[#635547] mt-1.5 font-semibold">As compared to blanket spraying methods</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-[#E9DFD3] rounded-2xl p-5 shadow-xs">
          <span className="block text-xs font-mono font-bold text-[#8C7D6E] uppercase tracking-wider">Flight Safety Margin</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl md:text-3xl font-bold text-[#2C2219]">94% Success</span>
          </div>
          <p className="text-xs text-[#635547] mt-1.5 font-semibold">Rate representing accurate targeting</p>
        </div>
      </div>

      {/* Filtering Actions */}
      <div className="bg-white/70 backdrop-blur border border-[#E9DFD3] rounded-2xl p-4 mb-8 flex flex-wrap gap-3 items-center justify-between shadow-xs">
        <div className="flex items-center gap-1.5 text-xs text-[#8C7D6E] font-mono font-bold mr-2">
          <Filter className="w-3.5 h-3.5 text-[#3E7250]" />
          <span>REAL-TIME FILTERS:</span>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center flex-1 sm:justify-start">
          {/* Field selection */}
          <select
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            className="bg-[#FAF7F2] text-[#2C2219] border border-[#E6DCCF] hover:border-[#CCA88A] px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer focus:outline-none min-w-[120px] shadow-xs"
          >
            {uniqueFields.map((field) => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>

          {/* Type Selection */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#FAF7F2] text-[#2C2219] border border-[#E6DCCF] hover:border-[#CCA88A] px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer focus:outline-none min-w-[120px] shadow-xs"
          >
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Date Range Selection */}
          <select
            value={selectedDateFilter}
            onChange={(e) => setSelectedDateFilter(e.target.value)}
            className="bg-[#FAF7F2] text-[#2C2219] border border-[#E6DCCF] hover:border-[#CCA88A] px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer focus:outline-none shadow-xs"
          >
            <option>Last 30 Days</option>
            <option>All Time</option>
          </select>
        </div>

        <span className="text-xs text-[#8C7D6E] font-mono font-bold">{filteredTreatments.length} logs matching</span>
      </div>

      {/* Timeline List of Deliveries */}
      <div className="relative border-l-2 border-[#EBE2D5] ml-4 pl-6 md:pl-8 space-y-6 pb-24">
        {filteredTreatments.length === 0 ? (
          <div className="bg-white/80 border border-[#E9DFD3] p-8 text-center text-[#635547] text-xs rounded-2xl shadow-xs font-bold">
            No logged drone deliveries match current criteria. Clear your filters above.
          </div>
        ) : (
          filteredTreatments.map((treat) => {
            const isCompleted = treat.status === "Completed";
            const isScheduled = treat.status === "Scheduled";
            const isFailed = treat.status === "Failed";
            const isExpanded = expandedId === treat.id;

            return (
              <div key={treat.id} className="relative group">
                {/* Timeline Dot Indicator */}
                <div className={`absolute -left-[31px] md:-left-[39px] top-1.5 w-[14px] h-[14px] rounded-full border-4 bg-[#FAF7F2] transition-transform duration-200 group-hover:scale-125 z-10 ${
                  isCompleted ? "border-[#3E7250]" :
                  isScheduled ? "border-[#D0743B]" :
                  "border-[#D9381E]"
                }`} />

                {/* Content log card */}
                <div
                  onClick={() => toggleExpand(treat.id)}
                  className={`bg-white/95 backdrop-blur-sm border rounded-2xl p-5 cursor-pointer transition-all duration-200 shadow-xs ${
                    isExpanded ? "border-[#3E7250] shadow-md shadow-[#3E7250]/5" : "border-[#E9DFD3] hover:border-[#CCA88A]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                    <div>
                      {/* Classification Badge + Date */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border leading-none ${
                          isCompleted ? "bg-[#EAF2ED] text-[#2E5A3E] border-[#C5D9CC]" :
                          isScheduled ? "bg-[#FDF3EB] text-[#D0743B] border-[#F8D2B7]" :
                          "bg-[#FDF2F1] text-[#D9381E] border-[#FADBD8]"
                        }`}>
                          {treat.status}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#8C7D6E]">{treat.date}</span>
                      </div>

                      <h3 className="text-sm md:text-[15px] font-bold text-[#2C2219] tracking-tight leading-tight">
                        {treat.type} — {treat.fieldName}
                      </h3>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs text-[#8C7D6E] font-mono font-bold block">COMPLIANCE CODE</span>
                      <span className="text-[#3E7250] font-mono text-xs font-bold">{treat.complianceId}</span>
                    </div>
                  </div>

                  {/* Operational Details row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-3 border-t border-b border-[#E6DCCF] my-3.5 text-xs text-[#635547] font-semibold">
                    <div>
                      <span className="block text-[10px] font-mono text-[#8C7D6E] uppercase">Vol. Discharged</span>
                      <span className="text-[#2C2219] font-bold">{treat.volume} Liters applied</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono text-[#8C7D6E] uppercase">Coverage</span>
                      <span className="text-[#2C2219] font-bold">{treat.acres} acres targeted</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono text-[#8C7D6E] uppercase">Duration</span>
                      <span className="text-[#2C2219] font-bold">{treat.duration} mins</span>
                    </div>
                  </div>

                  {/* Resource Estimates / Costs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#635547] font-semibold">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[#8C7D6E]">RESOURCE ALLOCATION:</span>
                      <span className="text-[#2E5A3E] font-bold">${treat.costFuel.toFixed(2)} drone fuel</span>
                      <span>+</span>
                      <span className="text-[#2B6285] font-bold">${treat.costSupplies.toFixed(2)} supplies</span>
                      <span>=</span>
                      <span className="text-[#2C2219] font-extrabold">${(treat.costFuel + treat.costSupplies).toFixed(2)} total</span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(treat.id);
                        }}
                        className="text-[11px] text-[#3E7250] hover:text-[#2E5A3E] hover:underline flex items-center gap-1 font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {isExpanded ? "Collapse Specs" : "View Report"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Report Details section */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-4 pt-4 border-t border-[#E6DCCF] text-xs text-[#635547] space-y-3 overflow-hidden"
                    >
                      <div>
                        <h4 className="text-[#2C2219] font-bold mb-1">Telemetry Audit Log:</h4>
                        <p className="leading-relaxed bg-[#FAF7F2] border border-[#E9DFD3] p-3 rounded-xl font-mono text-[#635547] font-semibold">
                          {treat.details}
                        </p>
                      </div>

                      <div className="bg-[#EAF2ED] border border-[#C5D9CC] p-3.5 rounded-xl flex items-start gap-2.5 text-[#2E5A3E]">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-xs text-[#2C2219]">USDA Organic Verification Status</p>
                          <p className="text-[11px] text-[#635547] mt-0.5 font-medium">
                            Standard audit trail logged with SHA-256 block ledger references under protocol organic compliance code {treat.complianceId}. Standard 3-year verification is valid.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
