/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Detection {
  id: string;
  name: string;
  severity: "High" | "Medium" | "Low";
  acreage: number;
  species?: string;
  area_acres?: number;
  icon?: string;
  lat?: number;
  lng?: number;
}

export interface ScanHistoryItem {
  date: string;
  status: string;
  detection_count: number;
  thumbnail_url?: string;
  message?: string;
}

export interface FieldScan {
  id: string;
  field_id?: string;
  name: string;
  field_name?: string;
  lastScanned: string; // e.g., "2 hours ago"
  last_scanned?: string;
  status: "Weeds Detected" | "Healthy" | "Critical";
  detections: Detection[];
  imageUrl?: string;
  acScanned?: number;
  total_acres?: number;
  crop_type?: string;
  location?: string;
  ndvi?: number;
  moisture_level?: number;
  pest_count?: number;
  center_lat?: number;
  center_lng?: number;
  polygon_geojson?: { lat: number; lng: number }[];
  scan_history?: ScanHistoryItem[];
  heatmap_data?: { lat: number; lng: number; weight: number }[];
}

export interface TreatmentHistoryItem {
  id: string;
  fieldName: string;
  type: string; // e.g., "Bio-herbicide treatment" / "Pest control"
  date: string;
  acres: number;
  duration: string; // e.g., "45 mins"
  status: "Completed" | "Scheduled" | "Failed";
  complianceId: string;
  volume: number; // e.g., 12.5 (liters)
  costFuel: number;
  costSupplies: number;
  details: string;
}

export interface ComplianceLogItem {
  id: string; // e.g., "COMP-48291"
  date: string;
  fieldName: string;
  actionType: string;
  details: string;
  status: "Verified" | "Pending";
}

export interface FarmProfile {
  farmName: string;
  totalAcres: number;
  certification: string;
  location: string;
}

export interface ConnectedServices {
  satellite: boolean;
  weather: boolean;
  drone: boolean;
  inventory: boolean;
}

export interface NotificationToggles {
  treatmentAlerts: boolean;
  lowStock: boolean;
  weatherWarnings: boolean;
  weeklyReports: boolean;
}

export interface ActionButton {
  label: string;
  actionKey: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  actionButtons?: ActionButton[];
  isSpecial?: boolean;
}

export interface SavedLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
}
