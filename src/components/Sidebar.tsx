/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { LayoutDashboard, Search, BarChart3, ClipboardList, Settings, Plus, X, User, LogOut, Brain } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ChatMessage } from "../types";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isOpenOnMobile: boolean;
  setIsOpenOnMobile: (isOpen: boolean) => void;
  onNewAnalysis: () => void;
  messages: ChatMessage[];
}

export default function Sidebar({
  currentView,
  onViewChange,
  isOpenOnMobile,
  setIsOpenOnMobile,
  onNewAnalysis,
  messages
}: SidebarProps) {
  const { currentUser, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const recentMessages = messages.slice(-3);

  const navItems = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "scans", label: "Field Scans", icon: Search },
    { id: "treatment", label: "Treatment History", icon: BarChart3 },
    { id: "compliance", label: "Compliance Logs", icon: ClipboardList },
    { id: "ml-metrics", label: "ML Observability", icon: Brain },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const handleNavClick = (viewId: string) => {
    onViewChange(viewId);
    setIsOpenOnMobile(false);
  };

  const handleConfirmLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Log out failed:", err);
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white/70 backdrop-blur-lg text-[#635547] p-4 border-r border-[#EBE2D5] w-[260px]">
      {/* Top Section */}
      <div>
        {/* Logo and Close Button for Mobile */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌾</span>
            <span className="text-[20px] font-bold text-[#2C2219] tracking-tight">FarmMind</span>
          </div>
          <button
            onClick={() => setIsOpenOnMobile(false)}
            className="md:hidden p-1 text-[#7E6E5D] hover:text-[#2C2219] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Session Button */}
        <button
          onClick={() => {
            onNewAnalysis();
            setIsOpenOnMobile(false);
          }}
          className="w-full flex items-center justify-center gap-2 bg-[#3E7250] hover:bg-[#2E5A3E] text-white py-2.5 px-4 rounded-xl mb-6 text-sm font-bold transition-all duration-200 shadow-xs border border-[#3E7250]/10 group cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
          New Chat / Analysis
        </button>
        
        {/* Navigation List */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-200 text-left ${
                  isActive
                    ? "bg-[#EAF2ED] text-[#2E5A3E] shadow-xs border-l-2 border-[#3E7250]"
                    : "hover:bg-[#F2ECE4] hover:text-[#2C2219]"
                }`}
              >
                <Icon className={`w-[20px] h-[20px] transition-colors ${isActive ? "text-[#3E7250]" : "text-[#9E9080]"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile Card or Logout Confirmation at bottom */}
      <div className="border-t border-[#EBE2D5] pt-4 mt-6">
        {!showLogoutConfirm ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#FAF6F0] flex items-center justify-center overflow-hidden border border-[#E6DCCF] shrink-0">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="User Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-[#7E6E5D]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-[#2C2219] truncate leading-tight">
                  {currentUser?.displayName || "Operator"}
                </h4>
                <p className="text-[10px] text-[#8C7D6E] truncate leading-tight mt-0.5">
                  {currentUser?.email || "Scout Account"}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-1.5 text-[#A39485] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0 cursor-pointer"
              title="Disconnect Session (Log Out)"
              id="logout-trigger-button"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="bg-red-50/75 rounded-xl p-3 border border-red-100 flex flex-col gap-2 relative shadow-2xs" id="logout-confirmation-panel">
            <p className="text-[11px] font-bold text-red-800 leading-tight">
              End scouting session & log out?
            </p>
            <div className="flex items-center gap-2 justify-between">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1.5 bg-white text-gray-500 hover:text-gray-750 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                id="cancel-logout-button"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="text-[10px] uppercase tracking-wider font-black px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                id="confirm-logout-button"
              >
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-[260px] flex-shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenOnMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpenOnMobile(false)}
            className="fixed inset-0 bg-[#2C2219]/20 backdrop-blur-xs transition-opacity"
          ></div>
          
          {/* Slide-out Panel */}
          <div className="relative flex flex-col w-[260px] h-full bg-[#FAF7F2] z-10 transition-transform duration-200 transform translate-x-0">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
