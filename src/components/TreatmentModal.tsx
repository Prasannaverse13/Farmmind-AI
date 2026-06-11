/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { FieldScan } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface TreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedScan: FieldScan | null;
  onConfirmDispatch: (scan: FieldScan) => void;
}

export default function TreatmentModal({
  isOpen,
  onClose,
  selectedScan,
  onConfirmDispatch
}: TreatmentModalProps) {
  const [dispatchState, setDispatchState] = useState<"idle" | "loading" | "success">("idle");

  if (!isOpen || !selectedScan) return null;

  // Derive parameters from selected Scan detection details
  const targetFieldName = selectedScan.name;
  const targetWeed = selectedScan.detections[0]?.name || "Amaranthus";
  const targetAcreage = selectedScan.detections[0]?.acreage || 2.3;
  const isAphids = targetWeed.toLowerCase().includes("aphid");

  // Flight calculations
  const durationText = targetAcreage > 3.0 ? "1 hour 15 minutes" : "45 minutes";
  const volumeLiters = targetAcreage > 3.0 ? 24.0 : 12.5;
  const fuelCostNum = targetAcreage > 3.0 ? 15.00 : 8.50;
  const suppliesCostNum = targetAcreage > 3.0 ? 88.00 : 45.20;
  const totalCostVal = fuelCostNum + suppliesCostNum;

  // Randomize a Mock Compliance Registration Code
  const mockCompCode = `COMP-${Math.floor(10000 + Math.random() * 90000)}`;

  const handleConfirm = () => {
    setDispatchState("loading");
    setTimeout(() => {
      setDispatchState("success");
      setTimeout(() => {
        onConfirmDispatch({
          ...selectedScan,
          status: "Healthy", // Switch scanned state to healthy when treatment is dispatched!
          detections: []
        });
        setDispatchState("idle");
        onClose();
      }, 1500);
    }, 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mr-0 select-none">
        {/* Full Screen Overlay Background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dispatchState === "idle" ? onClose : undefined}
          className="fixed inset-0 bg-[#2C2219]/60 backdrop-blur-sm"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-[520px] bg-white border border-[#E9DFD3] rounded-3xl p-6 md:p-8 shadow-2xl z-10 overflow-hidden"
        >
          {dispatchState === "success" ? (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-center py-10 flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-[#EAF2ED] border border-[#C5D9CC] flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-10 h-10 text-[#2E5A3E] animate-bounce" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-[#2C2219] tracking-tight">Dispatched Successfully!</h3>
              <p className="text-xs text-[#635547] max-w-[320px] mx-auto font-semibold leading-relaxed">
                Autopilot DJI Flight vectors uploaded safely. The drone has exited the launch station. Audit ledger COMP logged securely.
              </p>
            </motion.div>
          ) : (
            <>
              {/* Airplane Launcher Icon Header */}
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-[#EAF2ED]/60 flex items-center justify-center mb-4 border border-[#C5D9CC] text-3xl">
                  🚁
                </div>
                <h3 className="text-xl md:text-2xl font-black text-[#2C2219] tracking-tight">Approve Drone Dispatch</h3>
                <p className="text-sm text-[#635547] mt-1 pr-1 font-bold">
                  {targetFieldName}, Sector North — precision targeting of {targetWeed}
                </p>
              </div>

              {/* Data Specifications List */}
              <div className="bg-[#FAF7F2] border border-[#E9DFD3] rounded-2xl p-4 mb-5 divide-y divide-[#EBE2D5] text-xs font-mono font-semibold text-[#635547]">
                <div className="flex justify-between py-2">
                  <span className="text-[#8C7D6E] font-extrabold uppercase text-[10px]">Treatment Type</span>
                  <span className="text-[#2C2219] font-bold">
                    {isAphids ? "Organic Aphicide flight" : "Certified Bio-herbicide"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#8C7D6E] font-extrabold uppercase text-[10px]">Target Flora</span>
                  <span className="text-[#D9381E] font-bold">{targetWeed} ({targetAcreage} acres)</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#8C7D6E] font-extrabold uppercase text-[10px]">Estimated Flight Duration</span>
                  <span className="text-[#2C2219] font-bold">{durationText}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#8C7D6E] font-extrabold uppercase text-[10px]">Active Volume Required</span>
                  <span className="text-[#2C2219] font-bold">{volumeLiters} liters</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#8C7D6E] font-extrabold uppercase text-[10px]">Weather Flight Threshold</span>
                  <span className="text-[#2E5A3E] font-bold flex items-center gap-1">
                    🌤️ 2:00 PM — 4:00 PM (Wind &lt; 6kts)
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#8C7D6E] font-extrabold uppercase text-[10px]">Fuel Flight Cost</span>
                  <span className="text-[#2C2219] font-bold">${fuelCostNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 pt-3 text-sm border-t border-[#E9DFD3] items-center">
                  <span className="text-[#2C2219] font-extrabold">Total Estimated Cost</span>
                  <span className="text-[#3E7250] font-black text-md md:text-lg">${totalCostVal.toFixed(2)}</span>
                </div>
              </div>

              {/* Compliance ledger declaration */}
              <div className="flex gap-2.5 bg-[#EAF2ED] border border-[#C5D9CC] p-3.5 rounded-xl mb-6 items-start shadow-xs">
                <span className="text-[#2E5A3E] text-sm mt-0.5">✅</span>
                <p className="text-xs text-[#635547] font-semibold leading-relaxed">
                  This dispatch complies with USDA Organic limits. Safe flight telemetry will reside permanently on audit log ledger entry under compliance code <strong className="text-[#2E5A3E] font-bold font-mono">{mockCompCode}</strong>.
                </p>
              </div>

              {/* Button Triggers */}
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  disabled={dispatchState === "loading"}
                  className="flex-1 bg-transparent hover:bg-[#FAF6F0] border border-[#E6DCCF] text-[#635547] hover:text-[#2C2219] text-xs md:text-sm font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={dispatchState === "loading"}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#3E7250] hover:bg-[#2E5A3E] disabled:opacity-40 text-white text-xs md:text-sm font-bold py-3 rounded-xl transition-all shadow-md shadow-[#3E7250]/10 cursor-pointer"
                >
                  {dispatchState === "loading" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Uploading vectors...
                    </>
                  ) : (
                    "Confirm & Dispatch"
                  )}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
