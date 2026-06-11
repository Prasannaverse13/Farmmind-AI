/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { FarmProfile, ConnectedServices, NotificationToggles, SavedLocation } from "../types";
import { Save, CheckCircle, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth } from "../lib/firebase";
import { collection, getDocs, query, where, deleteDoc, doc, addDoc } from "firebase/firestore";

interface SettingsViewProps {
  profile: FarmProfile;
  services: ConnectedServices;
  toggles: NotificationToggles;
  onSaveProfile: (profile: FarmProfile) => void;
  onToggleServices: (services: ConnectedServices) => void;
  onToggleNotifications: (toggles: NotificationToggles) => void;
}

export default function SettingsView({
  profile,
  services,
  toggles,
  onSaveProfile,
  onToggleServices,
  onToggleNotifications
}: SettingsViewProps) {
  // Local state for tracking unsaved profile modifications
  const [farmName, setFarmName] = useState(profile.farmName);
  const [totalAcres, setTotalAcres] = useState(profile.totalAcres);
  const [certification, setCertification] = useState(profile.certification);
  const [location, setLocation] = useState(profile.location);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if initial props change
  useEffect(() => {
    setFarmName(profile.farmName);
    setTotalAcres(profile.totalAcres);
    setCertification(profile.certification);
    setLocation(profile.location);
  }, [profile]);

  const hasUnsavedProfile =
    farmName !== profile.farmName ||
    totalAcres !== profile.totalAcres ||
    certification !== profile.certification ||
    location !== profile.location;

  const handleSaveProfile = () => {
    setSavingProfile(true);
    setTimeout(() => {
      onSaveProfile({
        farmName,
        totalAcres: Number(totalAcres),
        certification,
        location
      });
      setSavingProfile(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }, 1000);
  };

  const handleServiceToggle = (key: keyof ConnectedServices) => {
    onToggleServices({
      ...services,
      [key]: !services[key]
    });
  };

  const handleNotificationToggle = (key: keyof NotificationToggles) => {
    onToggleNotifications({
      ...toggles,
      [key]: !toggles[key]
    });
  };

  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [newLocation, setNewLocation] = useState({ name: "", address: "", lat: 0, lng: 0 });

  useEffect(() => {
    const fetchSavedLocations = async () => {
      if (!auth.currentUser) return;
      const q = query(collection(db, "saved_locations"), where("userId", "==", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const locations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedLocation));
      setSavedLocations(locations);
    };
    fetchSavedLocations();
  }, [auth.currentUser]);

  const saveNewLocation = async () => {
    if (!auth.currentUser) return;
    const docRef = await addDoc(collection(db, "saved_locations"), {
      userId: auth.currentUser.uid,
      ...newLocation
    });
    setSavedLocations([...savedLocations, { id: docRef.id, ...newLocation }]);
    setNewLocation({ name: "", address: "", lat: 0, lng: 0 });
  };

  const deleteLocation = async (id: string) => {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, "saved_locations", id));
    setSavedLocations(savedLocations.filter(loc => loc.id !== id));
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#2C2219] tracking-tight">
          Settings
        </h2>
        <p className="text-sm text-[#635547] mt-1 font-semibold">
          Configure farm profiles, connect external imagery feeds, and customize autopilot notifications
        </p>
      </div>

      {/* SECTION 1: Farm Profile */}
      <div className="bg-white/80 backdrop-blur-md border border-[#E9DFD3] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-md md:text-lg font-bold text-[#2C2219] flex items-center gap-2">
            <span>🏡</span> Farm Profile
            {hasUnsavedProfile && (
              <span className="w-2 h-2 rounded-full bg-[#D0743B] animate-pulse" title="Unsaved changes" />
            )}
          </h3>

          <AnimatePresence>
            {hasUnsavedProfile && (
              <motion.span
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-[11px] font-mono font-bold text-[#D0743B]"
              >
                UNSAVED EDITS
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-bold text-[#8C7D6E] uppercase mb-1.5">Farm Name</label>
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              className="w-full bg-[#FAF7F2] text-xs md:text-sm text-[#2C2219] px-3.5 py-2.5 rounded-xl border border-[#E6DCCF] focus:border-[#3E7250] focus:outline-none transition-colors font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-[#8C7D6E] uppercase mb-1.5">Total Acres owned</label>
            <input
              type="number"
              value={totalAcres}
              onChange={(e) => setTotalAcres(Number(e.target.value))}
              className="w-full bg-[#FAF7F2] text-xs md:text-sm text-[#2C2219] px-3.5 py-2.5 rounded-xl border border-[#E6DCCF] focus:border-[#3E7250] focus:outline-none transition-colors font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-[#8C7D6E] uppercase mb-1.5">Standards Certification</label>
            <select
              value={certification}
              onChange={(e) => setCertification(e.target.value)}
              className="w-full bg-[#FAF7F2] text-xs md:text-sm text-[#2C2219] px-3.5 py-2.5 rounded-xl border border-[#E6DCCF] focus:border-[#3E7250] focus:outline-none transition-colors font-bold cursor-pointer"
            >
              <option value="USDA Organic">USDA Organic</option>
              <option value="Transitioning Organic">Transitioning Organic</option>
              <option value="Conventional Practice">Conventional Practice</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-[#8C7D6E] uppercase mb-1.5">Geographic Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-[#FAF7F2] text-xs md:text-sm text-[#2C2219] px-3.5 py-2.5 rounded-xl border border-[#E6DCCF] focus:border-[#3E7250] focus:outline-none transition-colors font-semibold"
            />
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile || !hasUnsavedProfile}
            className="flex items-center gap-2 bg-[#3E7250] text-white hover:bg-[#2E5A3E] disabled:opacity-40 disabled:hover:bg-[#3E7250] font-bold text-xs md:text-sm py-2.5 px-5 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            {savingProfile ? (
              "Saving changes..."
            ) : savedSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Saved Profile ✅
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 2: Connected Services */}
      <div className="bg-white/80 backdrop-blur-md border border-[#E9DFD3] rounded-2xl p-6 shadow-sm">
        <h3 className="text-md md:text-lg font-bold text-[#2C2219] mb-5 flex items-center gap-2">
          <span>🔌</span> Connected Services
        </h3>

        <div className="divide-y divide-[#E9DFD3]">
          {/* Row 1 Satellite */}
          <div className="flex items-center justify-between py-3.5">
            <div>
              <span className="text-xs font-bold text-[#2C2219] block">🛰️ Satellite Imagery</span>
              <span className="text-xs text-[#635547] font-semibold">Planet Labs connection feed (direct coordinates mapping)</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold leading-none ${services.satellite ? "text-[#2E5A3E]" : "text-[#D9381E]"}`}>
                {services.satellite ? (
                  <>
                    <Wifi className="w-3.5 h-3.5" />
                    Connected ✅
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5" />
                    Disconnected ❌
                  </>
                )}
              </span>
              <button
                onClick={() => handleServiceToggle("satellite")}
                className="bg-[#FAF7F2] border border-[#E6DCCF] text-[#4C3E31] hover:text-[#2C2219] hover:border-[#CCA88A] text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Configure
              </button>
            </div>
          </div>

          {/* Row 2 Weather */}
          <div className="flex items-center justify-between py-3.5">
            <div>
              <span className="text-xs font-bold text-[#2C2219] block">🌤️ Weather API Integration</span>
              <span className="text-xs text-[#635547] font-semibold">OpenWeatherMap radar feed (for drone wind speed checks)</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold leading-none ${services.weather ? "text-[#2E5A3E]" : "text-[#D9381E]"}`}>
                {services.weather ? (
                  <>
                    <Wifi className="w-3.5 h-3.5" />
                    Connected ✅
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5" />
                    Disconnected ❌
                  </>
                )}
              </span>
              <button
                onClick={() => handleServiceToggle("weather")}
                className="bg-[#FAF7F2] border border-[#E6DCCF] text-[#4C3E31] hover:text-[#2C2219] hover:border-[#CCA88A] text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Configure
              </button>
            </div>
          </div>

          {/* Row 3 Drone Fleet */}
          <div className="flex items-center justify-between py-3.5">
            <div>
              <span className="text-xs font-bold text-[#2C2219] block">🚁 Autonomous Drone Fleet</span>
              <span className="text-xs text-[#635547] font-semibold">DJI Agras spot-spraying flight network link</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold leading-none ${services.drone ? "text-[#2E5A3E]" : "text-[#D9381E]"}`}>
                {services.drone ? (
                  <>
                    <Wifi className="w-3.5 h-3.5" />
                    Connected ✅
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5" />
                    Disconnected ❌
                  </>
                )}
              </span>
              <button
                onClick={() => handleServiceToggle("drone")}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  services.drone
                    ? "bg-[#FAF7F2] border-[#E6DCCF] hover:text-[#D9381E] hover:border-[#FADBD8] text-[#4C3E31]"
                    : "bg-[#3E7250] border-[#3E7250] text-white hover:bg-[#2E5A3E]"
                }`}
              >
                {services.drone ? "Disconnect" : "Connect"}
              </button>
            </div>
          </div>

          {/* Row 4 Inventory */}
          <div className="flex items-center justify-between py-3.5">
            <div>
              <span className="text-xs font-bold text-[#2C2219] block">📦 Supplier Bio-Inventory API</span>
              <span className="text-xs text-[#635547] font-semibold">GreenGrow bio-herbicide live store supply tracker</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold leading-none ${services.inventory ? "text-[#2E5A3E]" : "text-[#D9381E]"}`}>
                {services.inventory ? (
                  <>
                    <Wifi className="w-3.5 h-3.5" />
                    Connected ✅
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5" />
                    Disconnected ❌
                  </>
                )}
              </span>
              <button
                onClick={() => handleServiceToggle("inventory")}
                className="bg-[#FAF7F2] border border-[#E6DCCF] text-[#4C3E31] hover:text-[#2C2219] hover:border-[#CCA88A] text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Configure
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Subscription */}
      <div className="bg-white/80 backdrop-blur-md border border-[#E9DFD3] rounded-2xl p-6 shadow-sm">
        <h3 className="text-md md:text-lg font-bold text-[#2C2219] mb-4 flex items-center gap-2">
          <span>💳</span> Subscription
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 mb-4 bg-[#FAF7F2] border border-[#E9DFD3] p-4 rounded-xl shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#2C2219]">Active Plan:</span>
              <span className="bg-[#EAF2ED] text-[#2E5A3E] text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded leading-none border border-[#C5D9CC]">
                🌾 Pro Plan
              </span>
            </div>
            <p className="text-xs text-[#635547] mt-1.5 leading-relaxed font-semibold">
              Billing rate of <span className="text-[#2C2219] font-bold">$999/month</span> (Standard Commercial tier). Next charge date: Jul 7, 2026.
            </p>
          </div>

          <button className="bg-white text-[#2C2219] hover:bg-[#FAF6F0] border border-[#E6DCCF] hover:border-[#CCA88A] text-xs font-bold px-4 py-2.5 rounded-xl transition-all self-start sm:self-auto cursor-pointer shadow-xs">
            Upgrade to Enterprise
          </button>
        </div>

        {/* Usage progress bar */}
        <div>
          <div className="flex justify-between items-center text-xs text-[#8C7D6E] mb-1.5 font-mono font-bold">
            <span>COORDINATE ACCREDITATION LIMITS</span>
            <span className="text-[#2C2219] font-bold leading-none">2,400 / 5,000 acres scanned</span>
          </div>
          <div className="w-full h-2.5 bg-[#EBE2D5] rounded-full overflow-hidden">
            <div className="h-full bg-[#3E7250] rounded-full transition-all" style={{ width: "48%" }} />
          </div>
        </div>
      </div>

      {/* SECTION 4: Notifications */}
      <div className="bg-white/80 backdrop-blur-md border border-[#E9DFD3] rounded-2xl p-6 shadow-sm">
        <h3 className="text-md md:text-lg font-bold text-[#2C2219] mb-5 flex items-center gap-2">
          <span>🔔</span> Autopilot Notifications
        </h3>

        <div className="space-y-4">
          {/* Toggle 1 */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#2C2219] block">Treatment Alerts</span>
              <span className="text-xs text-[#635547] font-semibold">Immediate notification when drone launches, finishes, or aborts flights</span>
            </div>
            {/* Custom Toggle Switch */}
            <button
              onClick={() => handleNotificationToggle("treatmentAlerts")}
              className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none cursor-pointer ${
                toggles.treatmentAlerts ? "bg-[#3E7250]" : "bg-[#EBE2D5]"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                  toggles.treatmentAlerts ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 2 */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#2C2219] block">Inventory Low Stock Warnings</span>
              <span className="text-xs text-[#635547] font-semibold">Alerts when bio-herbicide reserve falls under 50 liters</span>
            </div>
            <button
              onClick={() => handleNotificationToggle("lowStock")}
              className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none cursor-pointer ${
                toggles.lowStock ? "bg-[#3E7250]" : "bg-[#EBE2D5]"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                  toggles.lowStock ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 3 */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#2C2219] block">Weather Wind Safety Warnings</span>
              <span className="text-xs text-[#635547] font-semibold">Immediate warning if gusts in location exceed 12 knots safety threshold</span>
            </div>
            <button
              onClick={() => handleNotificationToggle("weatherWarnings")}
              className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none cursor-pointer ${
                toggles.weatherWarnings ? "bg-[#3E7250]" : "bg-[#EBE2D5]"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                  toggles.weatherWarnings ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 4 */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#2C2219] block">Weekly Consolidated Reports</span>
              <span className="text-xs text-[#635547] font-semibold">PDF digest email combining drone counts, acreage, and cost sheets</span>
            </div>
            <button
              onClick={() => handleNotificationToggle("weeklyReports")}
              className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none cursor-pointer ${
                toggles.weeklyReports ? "bg-[#3E7250]" : "bg-[#EBE2D5]"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-xs ${
                  toggles.weeklyReports ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* SECRETS / CRITICAL STREAMS INFO CARD - Architectural Honesty without slop */}
      {/* SECTION 5: Saved Farm Locations */}
      <div className="bg-white/80 backdrop-blur-md border border-[#E9DFD3] rounded-2xl p-6 shadow-sm">
        <h3 className="text-md md:text-lg font-bold text-[#2C2219] mb-5 flex items-center gap-2">
           <span>📍</span> Saved Farm Locations
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <input 
              placeholder="Name" 
              className="p-2 text-xs border rounded-lg"
              value={newLocation.name}
              onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
            />
            <input 
              placeholder="Address" 
              className="p-2 text-xs border rounded-lg"
              value={newLocation.address}
              onChange={(e) => setNewLocation({...newLocation, address: e.target.value})}
            />
            <input 
              type="number"
              placeholder="Lat" 
              className="p-2 text-xs border rounded-lg"
              value={newLocation.lat}
              onChange={(e) => setNewLocation({...newLocation, lat: parseFloat(e.target.value) || 0})}
            />
            <input 
              type="number"
              placeholder="Lng" 
              className="p-2 text-xs border rounded-lg"
              value={newLocation.lng}
              onChange={(e) => setNewLocation({...newLocation, lng: parseFloat(e.target.value) || 0})}
            />
          </div>
          <button 
            onClick={saveNewLocation}
            className="w-full bg-[#3E7250] text-white py-2 rounded-lg text-xs font-bold"
          >
            Add Location
          </button>
        </div>

        <div className="space-y-3 mt-4">
          {savedLocations.map((loc) => (
            <div key={loc.id} className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#E6DCCF]">
              <span className="text-xs font-semibold text-[#2C2219]">{loc.name || loc.address}</span>
              <button onClick={() => deleteLocation(loc.id)} className="text-xs text-red-500 hover:text-red-700 font-bold">Delete</button>
            </div>
          ))}
          {savedLocations.length === 0 && (
            <p className="text-xs text-[#635547] font-semibold">No locations saved yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
