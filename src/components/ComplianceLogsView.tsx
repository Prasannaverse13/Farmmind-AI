/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { ComplianceLogItem } from "../types";
import { Search, Download, CheckCircle2, Clock, ThumbsUp, ChevronLeft, ChevronRight } from "lucide-react";

interface ComplianceLogsViewProps {
  logs: ComplianceLogItem[];
}

export default function ComplianceLogsView({ logs }: ComplianceLogsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const ITEMS_PER_PAGE = 5;

  // Filter logs based on search query
  const filteredLogs = useMemo(() => {
    return (logs || []).filter((log) => {
      if (!log) return false;
      const q = (searchQuery || "").toLowerCase();
      return (
        (log.id || "").toLowerCase().includes(q) ||
        (log.fieldName || "").toLowerCase().includes(q) ||
        (log.actionType || "").toLowerCase().includes(q) ||
        (log.details || "").toLowerCase().includes(q)
      );
    });
  }, [logs, searchQuery]);

  // Paginated subset
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));

  const handleExportCSV = () => {
    setExporting(true);

    const headers = ["Log ID", "Date", "Field", "Action Type", "Details", "Status"];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map(log => 
        [log.id, log.date, log.fieldName, log.actionType, log.details, log.status].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "green_valley_organic_audit.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    setExporting(false);
  };  return (
    <div className="flex-1 w-full max-w-5xl mx-auto py-8 md:py-12 px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#2C2219] tracking-tight">
            Compliance Logs
          </h2>
          <p className="text-sm text-[#635547] mt-1 font-semibold">
            USDA Organic certification live digital ledger & flight audit trail
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center gap-2 self-start sm:self-auto bg-white hover:bg-[#FAF6F0] text-[#2C2219] border border-[#E6DCCF] hover:border-[#CCA88A] text-xs font-bold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-xs"
        >
          <Download className="w-4 h-4 text-[#3E7250]" />
          {exporting ? "Compiling Ledger..." : "Export CSV"}
        </button>
      </div>

      {/* Search Input bar */}
      <div className="relative mb-6">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search className="h-4 w-4 text-[#7E6E5D] font-bold" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1); // Reset to page 1 on search
          }}
          placeholder="Search logs by ID, field, or action type..."
          className="w-full bg-white border border-[#E1D1BF] hover:border-[#C4B29F] focus:border-[#3E7250] text-[#2C2219] text-sm rounded-xl px-4 py-3 pl-10 focus:outline-none transition-all shadow-xs placeholder-[#9E9080] font-medium"
        />
      </div>

      {/* Data Table */}
      <div className="bg-white border border-[#E9DFD3] rounded-2xl overflow-hidden shadow-xs pb-24 sm:pb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#FAF7F2] text-[11px] font-mono font-bold text-[#8C7D6E] uppercase tracking-wider border-b border-[#E9DFD3]">
                <th className="py-4 px-5">Log ID</th>
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5">Field</th>
                <th className="py-4 px-5">Action Type</th>
                <th className="py-4 px-5">Details</th>
                <th className="py-4 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9DFD3]">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-5 text-center text-[#7E6E5D] text-xs italic font-semibold">
                    No matching compliance logs recorded.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isVerified = log.status === "Verified";
                  return (
                    <tr
                      key={log.id}
                      className="bg-transparent hover:bg-[#FAF7F2]/60 transition-colors duration-150 py-4 font-normal"
                    >
                      <td className="py-4 px-5 text-[13px] font-mono text-[#3E7250] font-bold">
                        {log.id}
                      </td>
                      <td className="py-4 px-5 text-[13px] text-[#4C3E31] font-mono font-semibold">
                        {log.date}
                      </td>
                      <td className="py-4 px-5 text-[13px] text-[#2C2219] font-bold">
                        {log.fieldName}
                      </td>
                      <td className="py-4 px-5">
                        <span className="inline-block bg-[#EAF2ED] text-[#2E5A3E] font-mono font-bold text-[10px] px-2 py-0.5 rounded border border-[#C5D9CC] leading-none">
                          {log.actionType}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-[13px] text-[#635547] max-w-[280px] truncate font-semibold" title={log.details}>
                        {log.details}
                      </td>
                      <td className="py-4 px-5 text-[13px] text-right">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[#2E5A3E] font-bold text-xs leading-none bg-[#EAF2ED] px-2.5 py-1 rounded-full border border-[#C5D9CC]">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#D0743B] font-bold text-xs leading-none bg-[#FDF3EB] px-2.5 py-1 rounded-full border border-[#F8D2B7]">
                            <Clock className="w-3 h-3 animate-pulse" />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer/Pagination */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#FAF7F2] border-t border-[#E9DFD3] text-xs">
          <span className="text-[#635547] font-mono font-semibold">
            Showing {filteredLogs.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} ledger entries
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 px-2.5 bg-white border border-[#E6DCCF] hover:bg-[#FAF6F0] rounded-xl text-[#635547] hover:text-[#2C2219] disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-3.5 h-3.5 inline-block" />
            </button>

            {Array.from({ length: totalPages }, (_, idx) => {
              const pNum = idx + 1;
              const isActive = currentPage === pNum;
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded ${
                    isActive
                      ? "bg-[#3E7250] text-white shadow-xs"
                      : "bg-transparent text-[#7E6E5D] hover:text-[#2C2219]"
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 px-2.5 bg-white border border-[#E6DCCF] hover:bg-[#FAF6F0] rounded-xl text-[#635547] hover:text-[#2C2219] disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-3.5 h-3.5 inline-block" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
