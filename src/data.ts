/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FieldScan, TreatmentHistoryItem, ComplianceLogItem, FarmProfile, ConnectedServices, NotificationToggles, ChatMessage } from "./types";

export const INITIAL_FIELD_SCANS: FieldScan[] = [
  {
    id: "field-b",
    name: "Field B",
    lastScanned: "2 hours ago",
    status: "Weeds Detected",
    acScanned: 85,
    center_lat: 31.021,
    center_lng: 75.355,
    polygon_geojson: [
      { lat: 31.023, lng: 75.352 },
      { lat: 31.023, lng: 75.358 },
      { lat: 31.019, lng: 75.358 },
      { lat: 31.019, lng: 75.352 }
    ],
    detections: [
      { id: "det-1", name: "Amaranthus", severity: "Medium", acreage: 2.3 },
      { id: "det-2", name: "Aphids", severity: "Low", acreage: 0.8 }
    ]
  },
  {
    id: "field-a",
    name: "Field A",
    lastScanned: "1 day ago",
    status: "Healthy",
    acScanned: 110,
    center_lat: 31.025,
    center_lng: 75.348,
    polygon_geojson: [
      { lat: 31.028, lng: 75.344 },
      { lat: 31.028, lng: 75.352 },
      { lat: 31.022, lng: 75.352 },
      { lat: 31.022, lng: 75.344 }
    ],
    detections: []
  },
  {
    id: "field-c",
    name: "Field C",
    lastScanned: "3 hours ago",
    status: "Healthy",
    acScanned: 65,
    center_lat: 29.060,
    center_lng: 76.015,
    polygon_geojson: [
      { lat: 29.062, lng: 76.012 },
      { lat: 29.062, lng: 76.018 },
      { lat: 29.058, lng: 76.018 },
      { lat: 29.058, lng: 76.012 }
    ],
    detections: []
  },
  {
    id: "field-d",
    name: "Field D",
    lastScanned: "5 hours ago",
    status: "Weeds Detected",
    acScanned: 80,
    center_lat: 29.065,
    center_lng: 76.025,
    polygon_geojson: [
      { lat: 29.067, lng: 76.022 },
      { lat: 29.067, lng: 76.028 },
      { lat: 29.063, lng: 76.028 },
      { lat: 29.063, lng: 76.022 }
    ],
    detections: [
      { id: "det-3", name: "Lambsquarters", severity: "High", acreage: 4.1 }
    ]
  }
];

export const INITIAL_TREATMENT_HISTORY: TreatmentHistoryItem[] = [
  {
    id: "treat-1",
    fieldName: "Field B",
    type: "Bio-herbicide treatment — Sector North",
    date: "Jun 7, 2026",
    acres: 2.3,
    duration: "45 mins",
    status: "Completed",
    complianceId: "COMP-48291",
    volume: 12.5,
    costFuel: 8.50,
    costSupplies: 45.20,
    details: "12.5L applied to target Amaranthus outbreak in Sector North. Re-scan scheduled within 48 hours to confirm efficacy."
  },
  {
    id: "treat-2",
    fieldName: "Field B",
    type: "Organic pest spray — Sector South",
    date: "Jun 5, 2026",
    acres: 0.8,
    duration: "20 mins",
    status: "Completed",
    complianceId: "COMP-48280",
    volume: 5.0,
    costFuel: 4.20,
    costSupplies: 18.50,
    details: "Localized bio-aphicide sprayed via flight path Alpha. Total weather conditions were optimal (5mph heading North)."
  },
  {
    id: "treat-3",
    fieldName: "Field D",
    type: "Targeted bio-herbicide flight — Drone D2",
    date: "Jun 8, 2026",
    acres: 4.1,
    duration: "1 hour 15 mins",
    status: "Scheduled",
    complianceId: "COMP-48295",
    volume: 24.0,
    costFuel: 15.00,
    costSupplies: 88.00,
    details: "Dense Lambsquarters eradication flight. Autonomous flight path locked on pre-surveyed coordinates."
  },
  {
    id: "treat-4",
    fieldName: "Field C",
    type: "Nutrient Foliar booster — Drone D1",
    date: "Jun 2, 2026",
    acres: 10.0,
    duration: "30 mins",
    status: "Failed",
    complianceId: "COMP-48275",
    volume: 15.0,
    costFuel: 10.00,
    costSupplies: 55.00,
    details: "Flight aborted mid-session due to unexpected wind gusts exceeding 18 knots safety threshhold. 2 acres completed, rescheduling."
  }
];

export const INITIAL_COMPLIANCE_LOGS: ComplianceLogItem[] = [
  {
    id: "COMP-48291",
    date: "Jun 7, 2026",
    fieldName: "Field B",
    actionType: "Bio-herbicide Treatment",
    details: "Bio-herbicide treatment, 2.3 acres, 12.5L certified organic",
    status: "Verified"
  },
  {
    id: "COMP-48280",
    date: "Jun 5, 2026",
    fieldName: "Field B",
    actionType: "Organic Pest Control",
    details: "Organic aphid treatment flight, 0.8 acres on Sector South",
    status: "Verified"
  },
  {
    id: "COMP-48295",
    date: "Jun 8, 2026",
    fieldName: "Field D",
    actionType: "Planned Herbicide Application",
    details: "Awaiting automatic dispatch for Lambsquarters spot spraying",
    status: "Pending"
  },
  {
    id: "COMP-48275",
    date: "Jun 2, 2026",
    fieldName: "Field C",
    actionType: "Aborted Flight Incident Log",
    details: "Auto-logged safety flight abortion report due to wind gusts",
    status: "Verified"
  }
];

export const INITIAL_FARM_PROFILE: FarmProfile = {
  farmName: "Green Valley Organics",
  totalAcres: 340,
  certification: "USDA Organic",
  location: "Iowa, USA"
};

export const INITIAL_CONNECTED_SERVICES: ConnectedServices = {
  satellite: true,
  weather: true,
  drone: false,
  inventory: true
};

export const INITIAL_NOTIFICATION_TOGGLES: NotificationToggles = {
  treatmentAlerts: true,
  lowStock: true,
  weatherWarnings: true,
  weeklyReports: false
};

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-welcome",
    sender: "agent",
    text: "🌾 **Detection Summary**\nField B shows active weed development: Amaranthus (2.3 ac, medium severity) and Aphid activity (0.8 ac, low severity).\n\n📋 **Treatment Plan Suggested**\nI've generated a high-precision spot-treating blueprint utilizing 12.5L of certified organic bio-herbicide. Estimated drone flight time is 45 minutes.\n\n💰 **Cost Estimate / Action Ready**\nFuel: $8.50 | Organic Supplies: $45.20 | Total Cost: **$53.70**\n\nWould you like me to dispatch the drone to apply the localized treatment?",
    timestamp: "09:22 AM",
    isSpecial: true,
    actionButtons: [
      { label: "🚁 Approve Drone Dispatch", actionKey: "approve_dispatch" },
      { label: "📅 View Schedule", actionKey: "toggle_treatment_sec" }
    ]
  }
];
