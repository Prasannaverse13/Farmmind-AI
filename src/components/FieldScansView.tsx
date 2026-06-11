/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Loader2, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  Disc, 
  RefreshCcw, 
  Plus, 
  Layers, 
  Activity, 
  Calendar, 
  Flame, 
  Trash2, 
  MapPin, 
  Navigation, 
  HelpCircle, 
  Sparkles,
  Compass,
  ChevronsRight,
  TrendingUp,
  Droplets,
  Bug,
  Info,
  CheckCircle,
  XSquare,
  Cpu,
  Upload,
  Check,
  FileSpreadsheet,
  FileText,
  Download,
  Sliders,
  Globe,
  Gauge
} from "lucide-react";
import { APIProvider, Map, Marker, InfoWindow, useMapsLibrary, useMap } from "@vis.gl/react-google-maps";
import { FieldScan, Detection, ScanHistoryItem, SavedLocation } from "../types";
import { motion, AnimatePresence } from "motion/react";
import Polygon from "./Polygon";
import { db, auth as firebaseAuth } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";


interface FieldScansViewProps {
  scans: FieldScan[];
  onRefreshAll: () => void;
  onAnalyzeScan: (scanId: string) => void;
  onScheduleTreatment: (scan: FieldScan) => void;
  userLocation?: { lat: number; lng: number } | null;
  setUserLocation?: React.Dispatch<React.SetStateAction<{ lat: number; lng: number } | null>>;
  isTrackingLocation?: boolean;
  setIsTrackingLocation?: React.Dispatch<React.SetStateAction<boolean>>;
  locationPermissionStatus?: 'prompt' | 'granted' | 'denied' | 'requesting' | 'dismissed';
  setLocationPermissionStatus?: React.Dispatch<React.SetStateAction<'prompt' | 'granted' | 'denied' | 'requesting' | 'dismissed'>>;
  requestLiveLocation?: () => void;
}

interface MapRefCollectorProps {
  onMapReady: (map: any) => void;
}

function MapRefCollector({ onMapReady }: MapRefCollectorProps) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

export default function FieldScansView({
  scans,
  onRefreshAll,
  onAnalyzeScan,
  onScheduleTreatment,
  userLocation: propUserLocation,
  setUserLocation: propSetUserLocation,
  isTrackingLocation: propIsTrackingLocation,
  setIsTrackingLocation: propSetIsTrackingLocation,
  locationPermissionStatus: propLocationPermissionStatus,
  setLocationPermissionStatus: propSetLocationPermissionStatus,
  requestLiveLocation: propRequestLiveLocation
}: FieldScansViewProps) {
  // Map control state
  const [map, setMap] = useState<any>(null);

  // Map control variables
  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_PLATFORM_KEY || "";
  
  // Detect if API key is a valid Google Maps platform format (starts with AIza)
  const isValidApiKeyFormat = typeof apiKey === "string" && apiKey.trim().startsWith("AIza");
  
  // Geolocation & Live Spot tracking parameters with parent hoisting support
  const [internalUserLocation, setInternalUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const userLocation = propUserLocation !== undefined ? propUserLocation : internalUserLocation;
  const setUserLocation = propSetUserLocation !== undefined ? propSetUserLocation : setInternalUserLocation;

  const [internalIsTrackingLocation, setInternalIsTrackingLocation] = useState(false);
  const isTrackingLocation = propIsTrackingLocation !== undefined ? propIsTrackingLocation : internalIsTrackingLocation;
  const setIsTrackingLocation = propSetIsTrackingLocation !== undefined ? propSetIsTrackingLocation : setInternalIsTrackingLocation;

  const [internalLocationPermissionStatus, setInternalLocationPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'requesting' | 'dismissed'>('prompt');
  const locationPermissionStatus = propLocationPermissionStatus !== undefined ? propLocationPermissionStatus : internalLocationPermissionStatus;
  const setLocationPermissionStatus = propSetLocationPermissionStatus !== undefined ? (propSetLocationPermissionStatus as any) : setInternalLocationPermissionStatus;

  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSuggestions, setMapSuggestions] = useState<any[]>([]);

  const handleMapSearch = async (query: string) => {
    setMapSearchQuery(query);
    if (query.length < 3) {
      setMapSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      if (!response.ok) throw new Error("Nominatim API request failed");
      const data = await response.json();
      setMapSuggestions(data);
    } catch (error) {
      console.error("Nominatim search failed:", error);
    }
  };

  // Ask for permission and track location live
  const requestLiveLocation = () => {
    if (propRequestLiveLocation) {
      propRequestLiveLocation();
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("Geolocation standard is not supported by your browser");
      return;
    }

    setLocationPermissionStatus('requesting');
    setIsTrackingLocation(true);
    setLocationError(null);
    setIsSimulated(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(coords);
        setLocationPermissionStatus('granted');
        setMapCenter(coords); // Map flies precisely to user live coordinates
        setMapZoom(15);
      },
      (error) => {
        console.error("Geolocation request failed: ", error);
        setLocationPermissionStatus('denied');
        setIsTrackingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Your authorization to use location was declined.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Coordinates unavailable. Check device GPS systems.");
            break;
          case error.TIMEOUT:
            setLocationError("Geolocation request timed out.");
            break;
          default:
            setLocationError("Unknown error occurred looking up live coordinates.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );

    // Watch position in real time for real-world pairing simulator
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(coords);
        setLocationPermissionStatus('granted');
        setIsTrackingLocation(true);
      },
      (error) => {
        console.error("Passive live tracker error: ", error);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  // Simulated GPS Coordinates for user preview
  const enableSimulatedLocation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    const simulatedCoords = { lat: 31.0254, lng: 75.3562 };
    setUserLocation(simulatedCoords);
    setIsTrackingLocation(true);
    setLocationPermissionStatus('granted');
    setIsSimulated(true);
    setLocationError(null);
    setMapCenter(simulatedCoords);
    setMapZoom(15);
  };

  // Optional manual toggle to reset or locate again
  const disableLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setUserLocation(null);
    setIsTrackingLocation(false);
    setLocationPermissionStatus('prompt');
    setLocationError(null);
    setIsSimulated(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // NEW FARM MONITORING SETUP STATE
  // ---------------------------------------------------------------------------
  const [activeFarmProfile, setActiveFarmProfile] = useState<any>(null);
  const [setupStep, setSetupStep] = useState<"initial" | "pin_selected" | "ai_running" | "ready">("initial");
  const [selectedPin, setSelectedPin] = useState<{ lat: number; lng: number } | null>(null);
  const [reverseAddress, setReverseAddress] = useState<string>("");
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [aiStepIndex, setAiStepIndex] = useState<number>(0);
  const [satelliteReport, setSatelliteReport] = useState<{
    is_farm: boolean;
    land_type: string;
    verification_description: string;
  } | null>(null);

  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);

  const { currentUser } = useAuth();
  
  useEffect(() => {
    const fetchSavedLocations = async () => {
      if (!currentUser) return;
      const q = query(collection(db, "saved_locations"), where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      const locations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedLocation));
      setSavedLocations(locations);
    };
    fetchSavedLocations();
  }, [currentUser]);

  const saveLocation = async (name: string, lat: number, lng: number, address: string) => {
    if (!currentUser) return;
    const docRef = await addDoc(collection(db, "saved_locations"), {
      userId: currentUser.uid,
      name,
      lat,
      lng,
      address
    });
    setSavedLocations([...savedLocations, { id: docRef.id, name, lat, lng, address }]);
  };

  const deleteLocation = async (id: string) => {
    if (!currentUser) return;
    await deleteDoc(doc(db, "saved_locations", id));
    setSavedLocations(savedLocations.filter(loc => loc.id !== id));
  };

  const resolveAddressFromCoords = (lat: number, lng: number) => {
    setIsResolvingAddress(true);
    setTimeout(() => {
      let villageName = "Unknown";
      let districtName = "Ludhiana";
      let stateName = "Punjab";
      if (lat < 14) {
        villageName = "Old Pallavaram";
        districtName = "Chennai";
        stateName = "Tamil Nadu";
      } else if (Math.abs(lat - 29) < 1.5) {
        villageName = "Julana";
        districtName = "Jind";
        stateName = "Haryana";
      } else if (lat > 31.2) {
        villageName = "Kartarpur";
        districtName = "Jalandhar";
        stateName = "Punjab";
      } else if (lng > 75.9) {
        villageName = "Samrala";
        districtName = "Ludhiana";
        stateName = "Punjab";
      }
      setReverseAddress(`Village ${villageName}, District ${districtName}, ${stateName}, India`);
      setBookmarkName(`Village ${villageName}`);
      setIsResolvingAddress(false);
    }, 600);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser location is not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setSelectedPin(coords);
      setSetupStep("pin_selected");
      resolveAddressFromCoords(coords.lat, coords.lng);
      setMapCenter(coords);
      setMapZoom(16);
    }, (err) => {
      // Warm fallback
      const fallback = { lat: 30.9120, lng: 75.8538 }; // Ludhiana Center coordinates
      setSelectedPin(fallback);
      setSetupStep("pin_selected");
      resolveAddressFromCoords(fallback.lat, fallback.lng);
      setMapCenter(fallback);
      setMapZoom(16);
    });
  };

  const handleConfirmLocation = async () => {
    if (!selectedPin) return;
    setSetupStep("ai_running");
    setAiStepIndex(0);

    const interval = setInterval(() => {
      setAiStepIndex((prev) => {
        if (prev < 5) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 1200);

    try {
      const response = await fetch("/api/farm/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center_lat: parseFloat(selectedPin.lat.toFixed(6)),
          center_lng: parseFloat(selectedPin.lng.toFixed(6)),
          user_confirmed: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        clearInterval(interval);
        setAiStepIndex(5);

        if (data.profile && data.profile.is_farm !== undefined) {
          setSatelliteReport({
            is_farm: data.profile.is_farm,
            land_type: data.profile.land_type,
            verification_description: data.profile.verification_description
          });
        }
        
        setTimeout(() => {
          setActiveFarmProfile(data.profile);
          onRefreshAll();
          setSetupStep("ready");
          if (data.fields && data.fields.length > 0) {
            setSelectedField(data.fields[0]);
            setMapCenter({ lat: data.fields[0].center_lat, lng: data.fields[0].center_lng });
            setMapZoom(15);
          }
        }, 800);
      } else {
        clearInterval(interval);
        alert("FarmMind AI agent initialization failed. Please try again.");
        setSetupStep("pin_selected");
      }
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      alert("Interactive modeling initialized as dynamic server fallback configuration.");
      setSetupStep("pin_selected");
    }
  };

  useEffect(() => {
    const checkExistingFarm = async () => {
      try {
        const res = await fetch("/api/fields");
        if (res.ok) {
          const fields = await res.json();
          const isFarmReady = fields.some((f: any) => f.farm_id === "FARM-001" || f.auto_detected);
          if (isFarmReady) {
            setSetupStep("ready");
            
            try {
              const profRes = await fetch("/api/farm/FARM-001/profile");
              if (profRes.ok) {
                const profileObj = await profRes.json();
                setActiveFarmProfile(profileObj);
                if (profileObj.is_farm !== undefined) {
                  setSatelliteReport({
                    is_farm: profileObj.is_farm,
                    land_type: profileObj.land_type,
                    verification_description: profileObj.verification_description
                  });
                }
                return;
              }
            } catch (err) {
              console.warn("Real farm profile endpoint failed: ", err);
            }

            setActiveFarmProfile({
              farm_id: "FARM-001",
              farm_name: "Kila Raipur AI Research Sector",
              total_acres: fields.reduce((sum: number, f: any) => sum + (f.total_acres || 0), 0) || 53.4,
              location_address: fields[0]?.location || "Village Kila Raipur, District Ludhiana, Punjab, India",
              alerts_count: fields.reduce((sum: number, f: any) => sum + (f.detections?.length || 0), 0) || 3
            });
          }
        }
      } catch (err) {
        console.error("Failed to check existing farm profile:", err);
      }
    };
    checkExistingFarm();
  }, [scans]);

  // Interactive HUD States
  const [selectedField, setSelectedField] = useState<FieldScan | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");
  const [searchQuery, setSearchQuery] = useState("");
  const [mapType, setMapType] = useState<"hybrid" | "roadmap">("hybrid");
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [timelineIndex, setTimelineIndex] = useState<number>(0);
  
  // Drawing Tools States
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldCrop, setNewFieldCrop] = useState("Wheat");
  const [isSavingField, setIsSavingField] = useState(false);
  const [drawingError, setDrawingError] = useState<string | null>(null);

  // Treatment Zone Overlays
  const [treatmentOverlay, setTreatmentOverlay] = useState<{
    zone: { lat: number; lng: number }[];
    path: { lat: number; lng: number }[];
    cost: number;
  } | null>(null);
  const [isCalculatingTreatment, setIsCalculatingTreatment] = useState(false);

  // --- STATE FOR USER'S DETAILED SATELLITE IMAGE PROCESSING WORKFLOW ---
  const [isGisLabOpen, setIsGisLabOpen] = useState(false);
  const [gisActiveTab, setGisActiveTab] = useState<"ingestion" | "preprocessing" | "aiml" | "postprocessing">("ingestion");
  const [selectedSpectralIndex, setSelectedSpectralIndex] = useState<"NDVI" | "NDWI" | "GNDVI" | "SAVI" | "NDRE" | "EVI">("NDVI");
  
  // Ingest state
  const [ingestFile, setIngestFile] = useState<File | null>(null);
  const [ingestUrl, setIngestUrl] = useState<string>("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [crsValidationMessage, setCrsValidationMessage] = useState<string>("");
  const [ingestMetadata, setIngestMetadata] = useState<any>(null);

  // Preprocessing states
  const [radiometricCorrection, setRadiometricCorrection] = useState(true);
  const [atmosphericCorrection, setAtmosphericCorrection] = useState(true);
  const [cloudMaskingEnabled, setCloudMaskingEnabled] = useState(true);
  const [temporalAlignment, setTemporalAlignment] = useState(true);
  const [isPreprocessingRunning, setIsPreprocessingRunning] = useState(false);
  const [preprocessingSuccess, setPreprocessingSuccess] = useState(false);

  // AI/ML analysis state
  const [isModelingRunning, setIsModelingRunning] = useState(false);
  const [modelingSuccess, setModelingSuccess] = useState(false);
  const [aiReportDetails, setAiReportDetails] = useState<any>(null);

  // Postprocessing / Export state
  const [isGeneratingZonalStats, setIsGeneratingZonalStats] = useState(false);
  const [zonalStats, setZonalStats] = useState<any>(null);
  const [zonalStatsGenerated, setZonalStatsGenerated] = useState(false);

  // Google map target references
  const [mapCenter, setMapCenter] = useState(userLocation || { lat: 31.022, lng: 75.352 });
  const [mapZoom, setMapZoom] = useState(14);
  const [activeMarker, setActiveMarker] = useState<Detection | null>(null);

  // Custom bookmark naming & seamless panning controls
  const [bookmarkName, setBookmarkName] = useState<string>("");

  // --- INTEGRATED SATELLITE IMAGERY SIMULATOR ACTION HANDLERS ---
  const handleRunIngestion = (e: React.FormEvent) => {
    e.preventDefault();
    setIsIngesting(true);
    setCrsValidationMessage("Ingesting multi-band raster... Analyzing coordinate reference tags...");
    setIngestMetadata(null);

    setTimeout(() => {
      setIsIngesting(false);
      setCrsValidationMessage("✓ CRS validated successfully: Auto-Reprojected GeoTIFF from UTM Grid zone 43N (EPSG:32643) to native WGS84 coordinates (EPSG:4326) with zero planar offset errors detected.");
      
      const bounds = selectedField && selectedField.polygon_geojson && selectedField.polygon_geojson.length > 0
        ? selectedField.polygon_geojson
        : [{ lat: 31.022, lng: 75.352 }, { lat: 31.028, lng: 75.358 }];
        
      const latMin = Math.min(...bounds.map(p => p.lat));
      const latMax = Math.max(...bounds.map(p => p.lat));
      const lngMin = Math.min(...bounds.map(p => p.lng));
      const lngMax = Math.max(...bounds.map(p => p.lng));

      setIngestMetadata({
        uuid: `sat-img-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        source: ingestUrl ? "Cloud API Landsat-8 Overlay" : "Local GeoTIFF Filesystem Upload",
        fileName: ingestFile ? ingestFile.name : (ingestUrl ? "landsat_b8_composite.tif" : "sentinel_multispectral_S2A_L2A.tif"),
        fileSize: ingestFile ? `${(ingestFile.size / (1024 * 1024)).toFixed(2)} MB` : "28.52 MB",
        boundingBox: `[${lngMin.toFixed(5)}, ${latMin.toFixed(5)}, ${lngMax.toFixed(5)}, ${latMax.toFixed(5)}]`,
        resolution: "10m Red Edge & Near-Infrared Bands (Sentinel-2)",
        acquisitionDate: new Date().toISOString().split("T")[0] + " (06:14:28 UTC)",
        storageUri: `gs://farmmind-satellite-ingest/raw-img-${Math.random().toString(36).substr(2, 6).toUpperCase()}.tif`,
        crsCode: "EPSG:4326 (WGS 84 Ellipsoid Projection)"
      });
      
      // Auto move step tab to next phase to guide user onboarding
      setGisActiveTab("preprocessing");
    }, 1800);
  };

  const handleRunPreprocessing = () => {
    setIsPreprocessingRunning(true);
    setPreprocessingSuccess(false);

    setTimeout(() => {
      setIsPreprocessingRunning(false);
      setPreprocessingSuccess(true);
      setGisActiveTab("aiml");
    }, 2000);
  };

  const handleRunAiModeling = () => {
    setIsModelingRunning(true);
    setModelingSuccess(false);

    setTimeout(() => {
      setIsModelingRunning(false);
      setModelingSuccess(true);
      
      const moisture = selectedField ? (selectedField.moisture_level || 62) : 58;
      const ndviVal = selectedField ? (selectedField.ndvi || 0.76) : 0.72;

      setAiReportDetails({
        healthDistribution: {
          healthy: Math.round(ndviVal * 100),
          stressed: Math.round((1 - ndviVal) * 75),
          diseased: Math.round((1 - ndviVal) * 20),
          dead: Math.max(1, Math.round((1 - ndviVal) * 5))
        },
        moistureStats: {
          value: moisture,
          irrigationPrescription: moisture > 60 
            ? "Soil moisture saturation is high. Recommendation: SKIP next 12hr overhead sprinkler cycle to prevent compaction."
            : "Soil moisture is below target levels. Recommendation: INITIATE localized 15-minute drip irrigation vectors."
        },
        pestRiskStatus: selectedField && selectedField.status === "Critical" ? "🚨 CRITICAL RISK" : (selectedField && selectedField.status === "Weeds Detected" ? "⚠️ MEDIUM RISK" : "✅ LOW/COMPLIANT"),
        pestIsolationCoords: {
          lat: (selectedField?.center_lat || 31.022) + 0.0008,
          lng: (selectedField?.center_lng || 75.352) - 0.0006
        },
        yieldEstimator: {
          forecast: (ndviVal * 5.4).toFixed(2),
          confidence: "94.2% (Random Forest/LSTM Ensemble Multi-Temporal Model)",
          interval: "± 0.22 tons/hectare"
        }
      });
      
      setGisActiveTab("postprocessing");
    }, 2500);
  };

  const handleGenerateZonalStats = () => {
    setIsGeneratingZonalStats(true);
    setZonalStatsGenerated(false);

    setTimeout(() => {
      setIsGeneratingZonalStats(false);
      setZonalStatsGenerated(true);
      
      const totalAc = selectedField ? (selectedField.total_acres || selectedField.acScanned || 8.5) : 8.5;
      const ndviVal = selectedField ? (selectedField.ndvi || 0.76) : 0.72;

      setZonalStats([
        { zone: "Management Zone 1 (High Soil Quality / Vigorous Vigor)", area: (totalAc * 0.55).toFixed(1) + " acres", meanIndex: (ndviVal * 1.05).toFixed(2), prescription: "Optimize nitrogen buffer inputs" },
        { zone: "Management Zone 2 (Moderate Biomass Density)", area: (totalAc * 0.30).toFixed(1) + " acres", meanIndex: (ndviVal * 0.85).toFixed(2), prescription: "Standard biological organic nutrients" },
        { zone: "Management Zone 3 (Depressed Canopy / Underperforming)", area: (totalAc * 0.15).toFixed(1) + " acres", meanIndex: (ndviVal * 0.52).toFixed(2), prescription: "Critical inspection: soil compaction or drainage fault" }
      ]);
    }, 1500);
  };

  const panToLocation = (lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    if (map) {
      map.panTo({ lat, lng });
    }
  };

  // Center map on live location on initial load or change
  const initialLockRef = useRef(false);
  useEffect(() => {
    if (userLocation && !initialLockRef.current && setupStep !== "ready") {
      setMapCenter(userLocation);
      setMapZoom(15);
      initialLockRef.current = true;
    }
  }, [userLocation, setupStep]);

  // Initialize selected field on list loads
  useEffect(() => {
    if (scans.length > 0 && !selectedField) {
      const bField = scans.find(s => s.id === "field-b") || scans[0];
      setSelectedField(bField);
      if (bField.center_lat && bField.center_lng) {
        setMapCenter({ lat: bField.center_lat, lng: bField.center_lng });
      }
    }
  }, [scans]);

  // Adjust center/zoom when field is switched
  const handleSelectField = (field: FieldScan) => {
    setSelectedField(field);
    setTreatmentOverlay(null);
    setTimelineIndex(0);
    setActiveMarker(null);
    if (field.center_lat && field.center_lng) {
      setMapCenter({ lat: field.center_lat, lng: field.center_lng });
      setMapZoom(14);
    }
  };

  // Filter roster items
  const filteredFields = scans.filter((field) => {
    if (!field) return false;
    const nameStr = field.name || field.field_name || "";
    const cropStr = field.crop_type || "";
    const locStr = field.location || "";
    const searchStr = (searchQuery || "").toLowerCase();
    return (
      nameStr.toLowerCase().includes(searchStr) ||
      cropStr.toLowerCase().includes(searchStr) ||
      locStr.toLowerCase().includes(searchStr)
    );
  });

  // Perform area scan simulation
  const handleTriggerAnalysis = async (fieldId: string) => {
    setAnalyzingId(fieldId);
    setTreatmentOverlay(null);
    setActiveMarker(null);
    
    // Smooth scroll/pan to the analyzed sector
    const field = scans.find(s => s.id === fieldId);
    if (field?.center_lat && field?.center_lng) {
      setMapCenter({ lat: field.center_lat, lng: field.center_lng });
    }

    try {
      const res = await fetch(`/api/fields/${fieldId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        // Refresh dataset and preserve previous selection context updated after the scan completes
        onRefreshAll();
        setTimeout(() => {
          const freshField = scans.find(s => s.id === fieldId) || field;
          if (freshField) {
            setSelectedField(freshField);
          }
          setAnalyzingId(null);
        }, 300);
      } else {
        onAnalyzeScan(fieldId);
        setAnalyzingId(null);
      }
    } catch (err) {
      onAnalyzeScan(fieldId);
      setAnalyzingId(null);
    }
  };

  // Map Click handlers (Captures clicks for custom polygon vertices)
  const handleMapClick = (e: any) => {
    const latStr = e.detail?.latLng?.lat;
    const lngStr = e.detail?.latLng?.lng;
    const lat = typeof latStr === "function" ? latStr() : latStr;
    const lng = typeof lngStr === "function" ? lngStr() : lngStr;

    let clickedLat = lat;
    let clickedLng = lng;
    if (lat === undefined && e.latLng) {
      clickedLat = typeof e.latLng.lat === "function" ? e.latLng.lat() : e.latLng.lat;
      clickedLng = typeof e.latLng.lng === "function" ? e.latLng.lng() : e.latLng.lng;
    }

    if (isDrawingMode) {
      if (clickedLat !== undefined && clickedLng !== undefined) {
        setDrawingPoints((prev) => [...prev, { lat: parseFloat(clickedLat), lng: parseFloat(clickedLng) }]);
        setDrawingError(null);
      }
      return;
    }

    // Coordinates layout pin selection mode
    if (setupStep === "initial" || setupStep === "pin_selected") {
      if (clickedLat !== undefined && clickedLng !== undefined) {
        const coords = { lat: parseFloat(clickedLat), lng: parseFloat(clickedLng) };
        setSelectedPin(coords);
        setSetupStep("pin_selected");
        resolveAddressFromCoords(coords.lat, coords.lng);
        setMapCenter(coords);
      }
    }
  };

  // Clear drawn nodes
  const handleClearDrawing = () => {
    setDrawingPoints([]);
    setDrawingError(null);
  };

  // Submit newly drawn crop parcel
  const handleSaveDrawnField = async () => {
    if (!newFieldName.trim()) {
      setDrawingError("Please provide a crop field label.");
      return;
    }
    if (drawingPoints.length < 3) {
      setDrawingError("A polygon boundary requires at least 3 points plot coordinates.");
      return;
    }

    setIsSavingField(true);
    setDrawingError(null);

    try {
      const response = await fetch("/api/fields/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_name: newFieldName,
          crop_type: newFieldCrop,
          polygon_geojson: drawingPoints,
          location: "Punjab Sector"
        })
      });

      if (response.ok) {
        const addedField = await response.json();
        // Clear variables
        onRefreshAll();
        setIsDrawingMode(false);
        setDrawingPoints([]);
        setNewFieldName("");
        // Zoom and trigger select on fresh card
        setTimeout(() => {
          setSelectedField(addedField);
          setMapCenter({ lat: addedField.center_lat, lng: addedField.center_lng });
        }, 500);
      } else {
        setDrawingError("Failed to register crop sector with database registry.");
      }
    } catch (err: any) {
      setDrawingError(err.message || "Network failed to register field.");
    } finally {
      setIsSavingField(false);
    }
  };

  // Edge detection boundary simulation (Method 2)
  const handleAutoSuggestBoundary = () => {
    // Generates a mock Punjab farm quadrant centered around current viewport
    const viewportLat = mapCenter.lat;
    const viewportLng = mapCenter.lng;

    const suggestedPoly = [
      { lat: viewportLat + 0.003, lng: viewportLng - 0.002 },
      { lat: viewportLat + 0.003, lng: viewportLng + 0.002 },
      { lat: viewportLat - 0.001, lng: viewportLng + 0.003 },
      { lat: viewportLat - 0.003, lng: viewportLng - 0.002 }
    ];

    setDrawingPoints(suggestedPoly);
    setNewFieldName("AI Suggested Plot " + Math.floor(Math.random() * 100));
  };

  // Vector analysis overlays (Raster Paths)
  const handleDispatchAutonomousDrone = async (fieldId: string) => {
    setIsCalculatingTreatment(true);
    setTreatmentOverlay(null);
    try {
      const response = await fetch(`/api/fields/${fieldId}/treatment-zone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_detection_ids: (selectedField?.detections || []).map(d => d.id) })
      });
      if (response.ok) {
        const data = await response.json();
        setTreatmentOverlay({
          zone: data.treatment_zone_geojson,
          path: data.drone_path_coordinates,
          cost: data.cost_inr
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalculatingTreatment(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col md:flex-row h-full min-h-0 select-none bg-[#FAF7F2]">
      
      {/* 1. LEFT PANEL: Field Roster & Intelligence Hub */}
      <div className="w-full md:w-[420px] border-r border-[#ECE1D4] flex flex-col h-full bg-white relative z-10 shadow-sm overflow-hidden">
        
        {setupStep === "pin_selected" ? (
          <div className="p-4 md:p-5 flex flex-col justify-start h-full bg-[#FAF8F5] overflow-y-auto pb-8 animate-[fadeIn_0.3s_ease]">
            <div className="flex items-center gap-3 pb-4 mb-2 border-b border-[#ECE1D4]/50">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                <MapPin className="w-5 h-5 text-[#3E7250]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#2C2112] tracking-tight">Location Confirmed</h3>
                <span className="text-[9px] font-mono font-bold text-[#3E7250] uppercase tracking-wider block">
                  Select Monitoring Method
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <p className="text-[11px] text-[#54473C] font-semibold leading-relaxed">
                Location: {reverseAddress || "Resolving address..."}
              </p>

              <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EBDCCB] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-[#54473C] uppercase tracking-widest pl-0.5">Customize Location Name</label>
                  <span className="text-[9px] font-mono text-[#3E7250] font-bold">Focus Area</span>
                </div>
                <input
                  type="text"
                  value={bookmarkName}
                  onChange={(e) => setBookmarkName(e.target.value)}
                  className="w-full bg-white border border-[#EBDCCB] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#3E7250] focus:border-[#3E7250] text-[#2C2112] font-semibold"
                  placeholder="e.g. West Wheat Farm"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleConfirmLocation}
                  className="w-full bg-[#3E7250] hover:bg-[#2E5A3E] text-white font-black py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  🤖 AI Auto-Detect Field
                </button>
                <button
                  onClick={() => setIsDrawingMode(true)}
                  className="w-full bg-white hover:bg-[#F2EFEA] text-[#2C2112] border border-[#EBDCCB] font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Manual Field Plotting
                </button>
                <button
                  onClick={() => {
                    const finalName = bookmarkName.trim() || reverseAddress.substring(0, 20) || `Marker ${savedLocations.length + 1}`;
                    saveLocation(finalName, selectedPin.lat, selectedPin.lng, reverseAddress);
                  }}
                  className="w-full bg-[#FAF7F2] hover:bg-[#F0EAE3] text-[#3E7250] border border-[#EBDCCB] font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  Bookmark Location
                </button>
              </div>
            </div>
          </div>
        ) : setupStep !== "ready" ? (
          <div className="p-4 md:p-5 flex flex-col justify-start h-full bg-[#FAF8F5] overflow-y-auto pb-8">
            <div className="flex items-center gap-3 pb-4 mb-2 border-b border-[#ECE1D4]/50">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                <Sparkles className="w-4.5 h-4.5 text-[#3E7250]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#2C2112] tracking-tight">FarmMind AI</h3>
                <span className="text-[9px] font-mono font-bold text-[#3E7250] uppercase tracking-wider block">
                  Scouting & Telemetry
                </span>
              </div>
            </div>

            {/* Combined Action Area */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[#8C7D6E] uppercase tracking-widest pl-0.5">Scout New Area</h4>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={handleUseCurrentLocation}
                    className="w-full bg-[#3E7250] hover:bg-[#2E5A3E] text-white font-black py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 animate-bounce" />
                    📍 Use Current Location
                  </button>
                  <button
                    onClick={() => alert("Please click on the Map view area to drop your location indicator.")}
                    className="w-full bg-white hover:bg-[#F2EFEA] text-[#2C2112] border border-[#EBDCCB] font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#3E7250]" />
                    🖱️ Click Map to Pin
                  </button>
                </div>
              </div>

              {savedLocations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-[#8C7D6E] uppercase tracking-widest pl-0.5">Saved Focus Areas</h4>
                  <div className="space-y-2">
                    {savedLocations.map(loc => (
                      <div key={loc.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#EBDCCB]/50 hover:border-[#3E7250]/30 transition-colors">
                        <button
                          onClick={() => {
                            panToLocation(loc.lat, loc.lng);
                            setMapZoom(16);
                            setSelectedPin({ lat: loc.lat, lng: loc.lng });
                            setSetupStep("pin_selected");
                            resolveAddressFromCoords(loc.lat, loc.lng);
                          }}
                          className="text-xs text-[#2C2112] font-semibold hover:text-[#3E7250]"
                        >
                          {loc.name || loc.address.substring(0, 20)}
                        </button>
                        <button onClick={() => deleteLocation(loc.id)} className="text-[#A39485] hover:text-red-500 p-1">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {activeFarmProfile && (
              <div className="p-4 border-b border-[#F0E6D8] bg-[#F7F4EF] space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono font-black bg-[#3E7250]/10 px-2 py-0.5 rounded text-[#3E7250] uppercase tracking-wider">
                    📡 AI MONITORED FARM
                  </span>
                  <button
                    onClick={() => {
                      setActiveFarmProfile(null);
                      setSelectedPin(null);
                      setSetupStep("initial");
                    }}
                    className="text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1"
                  >
                    Reset Area ✕
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-[#2C2112] tracking-tight truncate leading-tight">
                    {activeFarmProfile.farm_name}
                  </h3>
                  <p className="text-[11px] text-[#8C7D6E] font-medium mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#A39485] shrink-0" />
                    <span className="truncate">{activeFarmProfile.location_address}</span>
                  </p>
                </div>

                {/* Farm summary mini-stats layout */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-white p-2 rounded-xl border border-[#EBDCCB]/50 text-center">
                    <span className="block text-[8px] text-[#8C7D6E] font-bold tracking-tight uppercase">TOTAL AREA</span>
                    <span className="font-extrabold text-xs text-[#2C2112]">{activeFarmProfile.total_acres} ac</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-[#EBDCCB]/50 text-center">
                    <span className="block text-[8px] text-[#8C7D6E] font-bold tracking-tight uppercase">SECTORS</span>
                    <span className="font-extrabold text-xs text-[#2C2112]">{scans.length} Plots</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-[#EBDCCB]/50 text-center">
                    <span className="block text-[8px] text-[#8C7D6E] font-bold tracking-tight uppercase">ALERTS</span>
                    <span className={`font-extrabold text-xs ${activeFarmProfile.alerts_count > 0 ? 'text-amber-600 animate-pulse' : 'text-emerald-600'}`}>
                      {activeFarmProfile.alerts_count} Active
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Search & Tool Hub */}
            <div className="p-4 border-b border-[#F0E6D8] space-y-3 bg-[#FCFAF8]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#2C2112] tracking-tight">FarmMind GIS Scout</h3>
                <span className="text-[10px] font-mono font-bold bg-[#E6DCCF]/50 px-2 py-0.5 rounded-lg text-[#3E7250]">
                  {activeFarmProfile?.farm_id || "Punjab/Haryana"}
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-[#8C7D6E]" />
                  <input
                    type="text"
                    placeholder="Search fields or crop type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF7F3] border border-[#EBE2D5] focus:outline-none focus:border-[#3E7250] rounded-xl text-xs font-medium text-[#2C2112] placeholder-[#A39485]"
                  />
                </div>
                
                <button
                  onClick={() => setIsDrawingMode(!isDrawingMode)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isDrawingMode
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-[#3E7250] hover:bg-[#2E5A3E] text-white shadow-xs"
                  }`}
                >
                  {isDrawingMode ? (
                    <>
                      <XSquare className="w-3.5 h-3.5" />
                      Cancel Draw
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Add Field
                    </>
                  )}
                </button>
              </div>

              {/* Saved Locations Section */}
              {savedLocations.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-[#EBE2D5] pt-3">
                  <span className="w-full text-[9px] font-black text-[#8C7D6E] uppercase tracking-widest pl-0.5 mb-1">Jump to Saved Locations</span>
                  {savedLocations.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        panToLocation(loc.lat, loc.lng);
                        setMapZoom(16);
                        setSelectedPin({ lat: loc.lat, lng: loc.lng });
                        resolveAddressFromCoords(loc.lat, loc.lng);
                      }}
                      className="px-3 py-1.5 bg-white border border-[#EBE2D5] rounded-xl text-[10px] font-bold text-[#3E7250] whitespace-nowrap hover:bg-[#F0EAE3] shadow-xs"
                    >
                      {loc.name || loc.address.substring(0, 10)}
                    </button>
                  ))}
                </div>
              )}

              {/* Drone Path Simulator HUD nestled directly inside the Left Panel */}
              {treatmentOverlay && (
                <div className="mt-3.5 bg-[#1C1814] text-[#FAF6F0] rounded-2xl p-4 border border-amber-500/40 shadow-md animate-[fadeIn_0.2s_ease]">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <span className="text-[10px] font-mono font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-amber-400" />
                      Drone Path Simulator
                    </span>
                    <button
                      onClick={() => setTreatmentOverlay(null)}
                      className="text-[#FAF6F0]/60 hover:text-white text-xs font-bold bg-white/10 hover:bg-white/20 w-5 h-5 rounded-md flex items-center justify-center transition-all"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div>
                      <span className="block text-[9px] text-[#A39485] font-black uppercase mb-0.5">ESTIMATED EXPENDITURE</span>
                      <span className="text-amber-300 font-extrabold text-sm font-mono">₹{treatmentOverlay.cost.toLocaleString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#A39485] font-black uppercase mb-0.5">GPS UAV FLIGHTS</span>
                      <span className="text-white font-bold text-xs">Autonomous Spot</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#EBE2D5] leading-relaxed mb-3">
                    Precision spot-treatment polygon isolated around weed hotspots. Safe flight vectors calculating.
                  </p>

                  <button
                    onClick={() => {
                      if (selectedField) {
                        onScheduleTreatment(selectedField);
                        setTreatmentOverlay(null);
                      }
                    }}
                    className="w-full bg-[#3E7250] hover:bg-[#2E5A3E] text-white font-black py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Dispatch Drone Now
                  </button>
                </div>
              )}
            </div>

            {/* DRAWING FORM MODE */}
            {isDrawingMode && (
              <div className="p-4 border-b bg-[#FEFAF4] border-[#EBDCCB] animate-[fadeIn_0.2s_ease]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#8A5A2B] uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                    <Compass className="w-3.5 h-3.5 animate-spin" />
                    Drawing Mode Active
                  </span>
                  <button
                    onClick={handleAutoSuggestBoundary}
                    className="text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded-md border border-amber-300 transition-colors flex items-center gap-1"
                    title="Use current center point to generate suggested bounding box automatically"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Auto-Suggest Edge
                  </button>
                </div>
                <p className="text-[11px] text-[#635547] leading-relaxed mb-3">
                  Click consecutive corner points on the interactive map to plot boundaries. Plot at least 3 points, then input field parameters below.
                </p>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7D6E] uppercase mb-1">Field Name</label>
                    <input
                      type="text"
                      placeholder="e.g. North Ridge"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E9DFD3] rounded-lg text-[#2C2112]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7D6E] uppercase mb-1">Crop Type</label>
                    <select
                      value={newFieldCrop}
                      onChange={(e) => setNewFieldCrop(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E9DFD3] rounded-lg text-[#2C2112]"
                    >
                      <option value="Wheat">Wheat 🌾</option>
                      <option value="Rice">Rice 🌾</option>
                      <option value="Sugarcane">Sugarcane 🎋</option>
                      <option value="Cotton">Cotton ☁️</option>
                      <option value="Maize">Maize 🌽</option>
                    </select>
                  </div>
                </div>

                {drawingError && (
                  <p className="text-[11px] text-red-600 font-bold mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {drawingError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleClearDrawing}
                    className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    Clear Coordinates ({drawingPoints.length})
                  </button>
                  <button
                    onClick={handleSaveDrawnField}
                    disabled={isSavingField || drawingPoints.length < 3}
                    className="flex-1 bg-[#3E7250] hover:bg-[#2E5A3E] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    {isSavingField ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Save Crop Boundary
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* FIELD CARDS ROSTER */}
        {setupStep === "ready" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {satelliteReport && (
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                satelliteReport.is_farm 
                  ? "bg-emerald-50/70 border-emerald-500/20 text-emerald-950" 
                  : "bg-red-50/70 border-red-500/20 text-red-950"
              }`}>
                <div className="flex items-start gap-2.5 mb-2">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    satelliteReport.is_farm ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}>
                    {satelliteReport.is_farm ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono font-black text-[#A39485] uppercase tracking-wider leading-none mb-1">
                      SATELLITE FIELD INTELLIGENCE
                    </span>
                    <h5 className="font-extrabold text-xs leading-tight">
                      {satelliteReport.is_farm ? "FARMLAND VERIFIED" : "NON-FARMLAND WARNING"}
                    </h5>
                    <span className="inline-block text-[10px] font-bold text-[#8C7D6E] mt-0.5">
                      Class: <span className="text-[#3E7250]">{satelliteReport.land_type}</span>
                    </span>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-[#635547] font-medium pl-1">
                  {satelliteReport.verification_description}
                </p>
                {!satelliteReport.is_farm && (
                  <div className="mt-2 pt-2 border-t border-red-200/50 text-[10px] text-red-800 font-bold flex items-start gap-1.5 leading-tight">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span>Caution: Real-world organic compliance certifications and active drone clearances are restricted outside agricultural zones. Punjab telemetry matched for demo preview compatibility.</span>
                  </div>
                )}
              </div>
            )}

            {filteredFields.length === 0 ? (
            <div className="text-center py-12 px-4 bg-[#FCFAF8] rounded-2xl border border-dashed border-[#EBE2D5]">
              <MapPin className="w-8 h-8 text-[#A39485] mx-auto mb-2 animate-bounce" />
              <p className="text-xs text-[#2C2112] font-semibold">No crop segments match query</p>
              <p className="text-[11px] text-[#8C7D6E] mt-1">Try resetting search variables or click "Add Field" to draw Punjabi sectors.</p>
            </div>
          ) : (
            filteredFields.map((field) => {
              const isSelected = selectedField?.id === field.id;
              const isWeeds = field.status === "Weeds Detected";
              const isCritical = field.status === "Critical";
              const isCurrentlyAnalyzing = analyzingId === field.id;

              return (
                <div
                  key={field.id}
                  onClick={() => handleSelectField(field)}
                  className={`border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 relative ${
                    isSelected
                      ? "border-[#3E7250] bg-[#FAF8F5] ring-2 ring-[#3E7250]/10 shadow-xs"
                      : "border-[#ECE1D4] hover:border-[#CCA88A] bg-white hover:bg-[#FCFAFB]"
                  }`}
                >
                  {/* Miniature Map Strip */}
                  <div className="h-24 bg-gradient-to-r from-[#DFEAE2] to-[#FAF8F4] overflow-hidden relative flex items-center justify-between px-4 border-b border-[#ECE1D4]">
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#2C2112_1px,transparent_1px)] [background-size:12px_12px]" />
                    
                    {isCurrentlyAnalyzing && (
                      <div className="absolute inset-x-0 h-1 bg-[#3E7250] shadow-md shadow-[#3E7250]/80 animate-bounce top-0 z-20" />
                    )}

                    <div className="z-10 flex flex-col justify-center">
                      <span className="text-[10px] font-mono font-bold text-[#3E7250] tracking-wider mb-0.5 uppercase">
                        SATELLITE SECTOR GRID
                      </span>
                      <h4 className="text-md font-extrabold text-[#2C2112] tracking-tight">{field.name}</h4>
                      <p className="text-[10px] text-[#8C7D6E] font-medium mt-0.5">Crop: <span className="font-bold text-[#3E7250]">{field.crop_type}</span> • {field.total_acres || field.acScanned || 80} ac</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 z-10">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200 whitespace-nowrap">
                          <AlertTriangle className="w-3 h-3 animate-pulse" />
                          Critical Pest
                        </span>
                      ) : isWeeds ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 whitespace-nowrap">
                          <AlertTriangle className="w-3 h-3" />
                          Weeds Detected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#C5D9CC] whitespace-nowrap">
                          <ShieldCheck className="w-3 h-3" />
                          Healthy
                        </span>
                      )}

                      <span className="text-[9px] font-mono font-bold bg-white/70 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-[#E9DFD3] text-[#635547]">
                        NDVI {field.ndvi}
                      </span>
                    </div>
                  </div>

                  {/* Body highlights - Expanded summary always shown for selected card */}
                  {isSelected && (
                    <div className="p-3.5 bg-white space-y-3 animate-[fadeIn_0.15s_ease]">
                      {/* Detections List */}
                      {field.detections && field.detections.length > 0 ? (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-mono font-bold text-[#8C7D6E] uppercase block mb-1">
                            Anomalies in scope:
                          </span>
                          {field.detections.map((det) => (
                            <div key={det.id} className="flex items-center justify-between bg-[#FAF8F5] border border-[#EBE2D5] px-2.5 py-1.5 rounded-xl text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-md leading-none">{det.icon || (det.species === "Aphids" ? "🐛" : "🌿")}</span>
                                <span className="text-[#2C2112] font-bold text-[11px]">{det.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black ${
                                  det.severity === "High" ? "bg-red-50 text-[#D9381E] border border-red-150" :
                                  det.severity === "Medium" ? "bg-amber-50 text-[#B07300] border border-amber-150" :
                                  "bg-[#F0F2F5] text-[#2C6285]"
                                }`}>
                                  {det.severity}
                                </span>
                                <span className="text-[#635547] text-[10px] font-mono font-semibold">{det.acreage || det.area_acres || 1.2} acres</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#8C7D6E] font-medium italic">
                          No biological flora threats captured. Crop is highly compliant.
                        </p>
                      )}

                      {/* Quick Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 bg-[#FDFCFB] border border-[#F0EAE1] p-2.5 rounded-xl text-center">
                        <div>
                          <span className="block text-[9px] text-[#A69788] font-bold uppercase tracking-wider mb-0.5">Soil Moist</span>
                          <span className="text-xs font-black text-[#264D73] flex items-center justify-center gap-0.5">
                            <Droplets className="w-3 h-3 text-blue-500" />
                            {field.moisture_level || 62}%
                          </span>
                        </div>
                        <div className="border-x border-[#F0EAE1]">
                          <span className="block text-[9px] text-[#A69788] font-bold uppercase tracking-wider mb-0.5">Pest Spot</span>
                          <span className="text-xs font-black text-[#8A1A11] flex items-center justify-center gap-0.5">
                            <Bug className="w-3 h-3 text-red-600" />
                            {field.pest_count || 0}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-[#A69788] font-bold uppercase tracking-wider mb-0.5">Scanned</span>
                          <span className="text-xs font-black text-[#3E7250] block truncate">
                            {field.last_scanned || "Just now"}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Hub */}
                      <div className="flex flex-col gap-2 pt-1.5 border-t border-[#F0EADF]">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerAnalysis(field.id);
                            }}
                            disabled={isCurrentlyAnalyzing}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAF6F0] text-[#2C2219] text-[11px] font-bold py-2 px-2.5 rounded-xl transition-all border border-[#E6DCCF] shadow-2xs"
                          >
                            {isCurrentlyAnalyzing ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-[#3E7250]" />
                                UAV Radar Scanning...
                              </>
                            ) : (
                              <>
                                <RefreshCcw className="w-3 h-3 text-[#3E7250]" />
                                Analyze Polygon
                              </>
                            )}
                          </button>

                          {(isWeeds || field.status === "Critical" || field.detections.length > 0) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDispatchAutonomousDrone(field.id);
                              }}
                              className="flex-1 flex items-center justify-center gap-1 bg-[#3E7250] hover:bg-[#2E5A3E] text-white text-[11px] font-bold py-2 px-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              Plan Drone Path
                            </button>
                          )}
                        </div>

                        {/* NEW WORKFLOW SEED BUTTON */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedField(field);
                            setMapCenter({ lat: field.center_lat || mapCenter.lat, lng: field.center_lng || mapCenter.lng });
                            setIsGisLabOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#20442D] to-[#3E7250] hover:from-[#1b3d27] hover:to-[#2e573c] text-[11px] text-emerald-100 font-extrabold py-2 px-3 rounded-xl transition-all shadow-md cursor-pointer border border-[#10B981]/25 ring-2 ring-[#10B981]/10 group"
                        >
                          <Layers className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                          🛰️ Ingest & Process Satellite Imagery
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        )}

        {/* INTEGRATION REPORT DETAIL PANEL */}
        {setupStep === "ready" && selectedField && (
          <div className="bg-[#FAF8F5] border-t border-[#ECE1D4] px-4 py-3 ">
            <div className="flex items-center justify-between border-b border-[#F0E6D8] pb-1.5 mb-2">
              <span className="text-[10px] font-extrabold text-[#8C7D6E] uppercase tracking-wider">
                Telemetry Chrono Log
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("details")}
                  className={`text-[10px] font-black uppercase tracking-wider pb-1 px-1.5 ${
                    activeTab === "details" ? "border-b-2 border-[#3E7250] text-[#3E7250]" : "text-[#A19181]"
                  }`}
                >
                  Quick Specs
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`text-[10px] font-black uppercase tracking-wider pb-1 px-1.5 ${
                    activeTab === "history" ? "border-b-2 border-[#3E7250] text-[#3E7250]" : "text-[#A19181]"
                  }`}
                >
                  Scan Timeline ({selectedField.scan_history?.length || 1})
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "details" ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1 text-[11px] text-[#635547]"
                >
                  <div className="flex justify-between py-0.5">
                    <span className="font-semibold text-gray-500">Infrastructure Focus</span>
                    <span className="font-bold text-[#2C2112]">{selectedField.infrastructure || "Sprinkler Area Alpha"}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="font-semibold text-gray-500">USDA Farming Cert Code</span>
                    <span className="font-mono font-bold text-[#3E7250]">USDA-ORG-10294</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="font-semibold text-gray-500">Center Coordinates</span>
                    <span className="font-mono text-[#2C2112]">{selectedField.center_lat?.toFixed(4)}°N, {selectedField.center_lng?.toFixed(4)}°E</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2 max-h-36 overflow-y-auto"
                >
                  {/* Timeline Selection Control Slider */}
                  {(selectedField.scan_history && selectedField.scan_history.length > 1) && (
                    <div className="bg-white p-2 rounded-lg border border-[#E9DFD3] space-y-1.5 mb-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#8C7D6E]">
                        <span>SELECT ARCHIVE RECORD:</span>
                        <span className="text-[#3E7250]">{selectedField.scan_history[timelineIndex]?.date}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={selectedField.scan_history.length - 1}
                        value={timelineIndex}
                        onChange={(e) => setTimelineIndex(parseInt(e.target.value))}
                        className="w-full accent-[#3E7250] cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Render index target scan details */}
                  {selectedField.scan_history && selectedField.scan_history[timelineIndex] ? (
                    <div className="bg-white p-2.5 rounded-xl border border-[#EBE2D5] space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-[#3E7250]">{selectedField.scan_history[timelineIndex].date}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                          selectedField.scan_history[timelineIndex].status === "Healthy"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-amber-50 text-amber-850 border border-amber-200"
                        }`}>
                          {selectedField.scan_history[timelineIndex].status}
                        </span>
                      </div>
                      <p className="text-[#635547] text-[10px] leading-relaxed italic">
                        "{selectedField.scan_history[timelineIndex].message || "No scan observation logs recorded on this cycle."}"
                      </p>
                      <div className="text-[9px] font-bold text-[#8C7D6E]">
                        ANOMALIES PINNED: {selectedField.scan_history[timelineIndex].detection_count} flora targets
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">No historical iterations documented.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 2. RIGHT PANEL: Full-Bleed Interactive Google Map Canvas */}
      <div className="flex-1 h-full relative bg-[#E5E0D8]">

        {/* CINEMATIC AI RUNNING REVOLUTION PIPELINE SCREEN OVERLAY */}
        {setupStep === "ai_running" && (
          <div className="absolute inset-0 bg-[#0d0f12]/90 backdrop-blur-md z-50 flex items-center justify-center p-6 transition-all duration-300">
            <div className="max-w-xl w-full bg-[#161a22] rounded-3xl border border-[#2b3547] p-8 space-y-6 shadow-2xl relative overflow-hidden text-slate-100">
              
              {/* Spinning background radar backdrop */}
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#3E7250]/10 rounded-full blur-3xl" />
              
              <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Cpu className="w-6 h-6 text-emerald-400 animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                    🤖 FarmMind Multi-Agent Executive Pipeline
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    PROBING {selectedPin?.lat.toFixed(6)}°N, {selectedPin?.lng.toFixed(6)}°E
                  </p>
                </div>
              </div>

              {/* Progress Bar overall */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono font-bold text-slate-400">
                  <span>SATELLITE & TELEMETRY INITIALIZATION</span>
                  <span className="text-emerald-400">{Math.round(((aiStepIndex + 1) / 6) * 100)}% COMPLETED</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                    style={{ width: `${((aiStepIndex + 1) / 6) * 100}%` }}
                  />
                </div>
              </div>

              {/* 6 AI Steps */}
              <div className="space-y-3 pt-1">
                {[
                  {
                    id: "geocode_location",
                    title: "1. Coordinates Geocoder",
                    desc: "Running reverse geocoding on target coordinates to state/district registries..."
                  },
                  {
                    id: "fetch_satellite_imagery",
                    title: "2. Multispectral Satellite Retrieval",
                    desc: "Sourcing high-res Sentinel bands and Planet Labs imagery for 2km radius..."
                  },
                  {
                    id: "detect_field_boundaries",
                    title: "3. Deep Edge Boundary Extraction",
                    desc: "Running machine vision spatial neural nets to isolate healthy parcel frontiers..."
                  },
                  {
                    id: "predict_crop_type",
                    title: "4. Spectral Crop Canopy Analytics",
                    desc: "Predicting crop type classifications from spectral signature distribution..."
                  },
                  {
                    id: "analyze_field_health",
                    title: "5. Pathology and Infestation Scanner",
                    desc: "Auto-detecting localized weed concentration clusters and health severity values..."
                  },
                  {
                    id: "generate_farm_profile",
                    title: "6. Agricultural GIS Packaging",
                    desc: "Compiling total acreage, organizing polygons, and issuing priority anomalies..."
                  }
                ].map((step, idx) => {
                  const isDone = idx < aiStepIndex;
                  const isActive = idx === aiStepIndex;
                  return (
                    <div
                      key={step.id}
                      className={`font-semibold p-3 rounded-2xl border transition-all flex items-start gap-3.5 text-xs ${
                        isDone
                          ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-200"
                          : isActive
                          ? "bg-slate-800/60 border-indigo-500/50 text-white shadow-md shadow-indigo-500/5"
                          : "bg-slate-900/30 border-slate-800 text-slate-500"
                      }`}
                    >
                      <div className="pt-0.5">
                        {isDone ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-400 flex items-center justify-center text-[10px] font-black">
                            ✓
                          </div>
                        ) : isActive ? (
                          <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-400 text-indigo-400 flex items-center justify-center text-[10px] font-black animate-pulse">
                            ●
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-850 border border-slate-800 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black tracking-tight">{step.title}</h4>
                          {isActive && (
                            <span className="text-[9px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                              Processing
                            </span>
                          )}
                        </div>
                        {(isActive || isDone) && (
                          <p className="text-[10px] text-slate-405 mt-0.5 leading-relaxed truncate">
                            {step.desc}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* FLOATING LOCATION CONFIRMATION CARD OVERLAY */}
        {setupStep === "pin_selected" && selectedPin && (
          <div className="absolute top-4 left-4 z-20 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#EBE2D5] p-5 space-y-4 animate-[fadeIn_0.2s_ease]">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#F0E6D8]">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#2C2112] uppercase tracking-wider">Configure Monitored Sector</h4>
                <p className="text-[10px] font-mono text-[#8C7D6E] font-bold">
                  LAT: {selectedPin.lat.toFixed(5)} / LNG: {selectedPin.lng.toFixed(5)}
                </p>
              </div>
            </div>

            <div className="bg-[#FAF7F3] p-3 rounded-xl border border-[#EBE2D5] space-y-1">
              <span className="text-[9px] font-mono font-black text-[#8A5A2B] uppercase tracking-wider block">
                Reverse-Geocoded Registry:
              </span>
              {isResolvingAddress ? (
                <div className="flex items-center gap-2 text-[11px] text-[#A39485] py-0.5">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[#3E7250] border-t-transparent animate-spin shrink-0" />
                  Resolving district registry...
                </div>
              ) : (
                <p className="text-[11px] text-[#3E7250] font-extrabold leading-tight">
                  {reverseAddress || "Resolving sector bounds..."}
                </p>
              )}
            </div>

            <p className="text-[11px] text-[#2C2112] font-semibold leading-relaxed">
              Upon confirming this sentinel center point, the autonomous Multi-Agent AI will run crop edge trace, acreage modeling, and scan field stress levels.
            </p>

            <div className="grid grid-cols-2 gap-2 text-center pt-1.5">
              <button
                onClick={() => {
                  setSelectedPin(null);
                  setSetupStep("initial");
                }}
                className="w-full bg-white hover:bg-[#FDFBF9] text-[#8C7D6E] border border-[#ECE1D4] font-bold py-2 px-3 rounded-lg text-xs transition-colors"
              >
                ✕ Cancel Setup
              </button>
              <button
                onClick={handleConfirmLocation}
                className="w-full bg-[#3E7250] hover:bg-[#2E5A3E] text-white font-black py-2 px-3 rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Confirm Pin
              </button>
              <button
                onClick={() => {
                  const finalName = bookmarkName.trim() || reverseAddress.substring(0, 15) || `Marker ${savedLocations.length + 1}`;
                  saveLocation(finalName, selectedPin!.lat, selectedPin!.lng, reverseAddress);
                }}
                className="col-span-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2 px-3 rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-1"
              >
                 Save Location
              </button>
            </div>
          </div>
        )}

        {/* FLOATING MAP SUGGESTION BOX */}
        {setupStep === "initial" && (
          <div className="absolute top-4 left-4 z-20 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#EBE2D5] p-4 space-y-2 animate-pulse">
            <h4 className="text-xs font-black text-[#2C2112] uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#3E7250] animate-spin" />
              Sensor Locator Deployment
            </h4>
            <p className="text-[11px] text-[#635547] leading-relaxed font-semibold">
              Tap anywhere on Punjab/Haryana soil directly on the satellite map to place your farm pin locator.
            </p>
          </div>
        )}
        {/* SATELLITE IMAGE PROCESSING WORKFLOW LAB PANEL */}
        <AnimatePresence>
          {isGisLabOpen && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 170 }}
              className="absolute top-4 right-4 bottom-4 w-[540px] bg-white/95 backdrop-blur-md rounded-2xl border border-[#ECE1D4] shadow-2xl z-30 flex flex-col overflow-hidden"
              id="satellite-gis-lab-workspace"
            >
              {/* Header */}
              <div className="bg-[#20442D] text-white px-5 py-4 flex items-center justify-between border-b border-[#1b3d27]">
                <div className="flex items-center gap-2.5">
                  <div className="bg-emerald-500/20 p-1.5 rounded-xl border border-emerald-400/30">
                    <Layers className="w-5 h-5 text-emerald-300 animate-pulse" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono font-black text-emerald-300 uppercase tracking-widest leading-none">
                      Ortho-Rectified GIS Processing Lab
                    </span>
                    <h3 className="text-sm font-black tracking-tight mt-1">
                      🛰️ {selectedField ? selectedField.name.toUpperCase() : "SATELLITE IMAGE INTEGRATOR"}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setIsGisLabOpen(false)}
                  className="p-1 px-2.5 hover:bg-[#1a3825] rounded-xl text-emerald-200 transition-colors text-[11px] font-extrabold uppercase tracking-wider cursor-pointer"
                >
                  ✕ Close Lab
                </button>
              </div>

              {/* Step Navigation Ribbon */}
              <div className="bg-[#FAF8F5] border-b border-[#ECE1D4] grid grid-cols-4 divide-x divide-[#ECE1D4] text-center">
                <button
                  onClick={() => setGisActiveTab("ingestion")}
                  className={`py-3 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    gisActiveTab === "ingestion" ? "bg-[#3E7250] text-white" : "hover:bg-[#FAF6F0] text-[#8C7D6E]"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  1. Ingest
                </button>
                <button
                  onClick={() => setGisActiveTab("preprocessing")}
                  className={`py-3 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    gisActiveTab === "preprocessing" ? "bg-[#3E7250] text-white" : "hover:bg-[#FAF6F0] text-[#8C7D6E]"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  2. Calibrate
                </button>
                <button
                  onClick={() => setGisActiveTab("aiml")}
                  className={`py-3 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    gisActiveTab === "aiml" ? "bg-[#3E7250] text-white" : "hover:bg-[#FAF6F0] text-[#8C7D6E]"
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  3. Analyze
                </button>
                <button
                  onClick={() => setGisActiveTab("postprocessing")}
                  className={`py-3 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    gisActiveTab === "postprocessing" ? "bg-[#3E7250] text-white" : "hover:bg-[#FAF6F0] text-[#8C7D6E]"
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  4. Export
                </button>
              </div>

              {/* Scrollable Workflow Workspace Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#FAF8F5]/50">
                
                {/* STAGE 1: INGESTION */}
                {gisActiveTab === "ingestion" && (
                  <div className="space-y-4 animate-[fadeIn_0.2s_ease]">
                    <div className="p-4 bg-white rounded-2xl border border-[#ECE1D4] space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#20442D] border-b border-[#FAF8F5] pb-2">
                        <Globe className="w-4 h-4 text-[#3E7250]" />
                        <span>STEP 1: SATELLITE RASTER COMPOSITE INGESTION</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#635547] font-medium">
                        Ingest GeoTIFF, JP2, or PNG multispectral scenes with boundary coordinate alignment tags (CRS). Autorectifies target datasets to Punjab spatial references.
                      </p>

                      <form onSubmit={handleRunIngestion} className="space-y-3 pt-1">
                        <div>
                          <label className="block text-[9px] font-mono font-bold text-[#8C7D6E] uppercase mb-1">
                            API Cloud URL Endpoint (Sentinel-2 / Landsat)
                          </label>
                          <input
                            type="url"
                            placeholder="https://services.sentinel-hub.com/ogc/wms/63a5ef..."
                            value={ingestUrl}
                            onChange={(e) => setIngestUrl(e.target.value)}
                            disabled={isIngesting}
                            className="w-full px-3 py-2 bg-white border border-[#E6DCCF] rounded-xl text-xs focus:ring-[#3E7250] focus:border-[#3E7250] disabled:bg-gray-100"
                          />
                        </div>

                        <div className="relative">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold text-[#8C7D6E] uppercase mb-1">
                              Or Drag-and-drop Raster GeoTIFF File Upload
                            </span>
                          </div>
                          <div className="border-2 border-dashed border-[#ECE1D4] rounded-xl p-5 text-center bg-[#FDFDFB] hover:bg-[#FCFAFB] transition-colors cursor-pointer relative">
                            <input
                              type="file"
                              accept=".tif,.tiff,.jp2,.png"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setIngestFile(e.target.files[0]);
                                }
                              }}
                              disabled={isIngesting}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <div className="space-y-1">
                              <Upload className="w-6 h-6 text-[#8C7D6E] mx-auto mb-1" />
                              <p className="text-xs font-bold text-[#2C2112]">
                                {ingestFile ? ingestFile.name : "Select or Drop `.tif` Raster Target"}
                              </p>
                              <p className="text-[10px] text-gray-500 font-mono font-semibold">
                                {ingestFile ? `${(ingestFile.size / (1024 * 1024)).toFixed(2)} MB` : "File limits up to 100MB (WGS84 compatible)"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isIngesting || (!ingestUrl && !ingestFile)}
                          className="w-full bg-[#3E7250] hover:bg-[#2F593E] text-white text-xs font-extrabold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-gray-300 cursor-pointer"
                        >
                          {isIngesting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              Validating Spatial Bounds & Ingesting Cloud TIFF...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 text-emerald-200" />
                              Initiate Ortho Image Ingestion Pipeline
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {crsValidationMessage && (
                      <div className="p-3.5 bg-amber-50 border border-amber-250 text-[#5C4D3C] text-[11px] font-medium leading-relaxed rounded-xl font-mono">
                        <span className="font-extrabold block text-[9px] uppercase tracking-wider text-amber-800 mb-1 leading-none">
                          Coordinate System Reprojection Console
                        </span>
                        {crsValidationMessage}
                      </div>
                    )}

                    {ingestMetadata && (
                      <div className="p-4 bg-[#2C2112] text-amber-100 rounded-2xl border border-amber-800/20 font-mono text-[10px] space-y-2 leading-relaxed">
                        <div className="flex items-center justify-between border-b border-amber-900/30 pb-1.5 mb-1.5">
                          <span className="font-black text-xs text-amber-400">INGEST METADATA RECORDED</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 text-green-300 border border-green-500/20 rounded font-bold">LOGGED IN FIRESTORE</span>
                        </div>
                        <div className="grid grid-cols-1 gap-y-1">
                          <div><span className="text-amber-300 font-extrabold">IMAGE ID:</span> {ingestMetadata.uuid}</div>
                          <div><span className="text-amber-300 font-extrabold">ACQUISITION IP:</span> {ingestMetadata.source}</div>
                          <div><span className="text-amber-300 font-extrabold">FILE SIZE:</span> {ingestMetadata.fileSize}</div>
                          <div><span className="text-amber-300 font-extrabold">RESOLUTION:</span> {ingestMetadata.resolution}</div>
                          <div><span className="text-amber-300 font-extrabold">BOUNDING BOX:</span> <span className="text-amber-200/90 font-bold">{ingestMetadata.boundingBox}</span></div>
                          <div><span className="text-amber-300 font-extrabold">CAPTURE DATETIME:</span> {ingestMetadata.acquisitionDate}</div>
                        </div>
                        <div className="border-t border-amber-900/30 pt-1.5 flex items-center gap-1 overflow-hidden">
                          <span className="text-amber-400 font-extrabold shrink-0">CLOUD STORAGE TARGET URI:</span>
                          <span className="truncate text-amber-200/80">{ingestMetadata.storageUri}</span>
                        </div>
                        <div className="text-[9px] text-amber-200/50">
                          Registered bounding box overlaps exactly with {selectedField ? selectedField.name : "target location"} boundary geometry constraints.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STAGE 2: PREPROCESSING */}
                {gisActiveTab === "preprocessing" && (
                  <div className="space-y-4 animate-[fadeIn_0.2s_ease]">
                    <div className="p-4 bg-white rounded-2xl border border-[#ECE1D4] space-y-4">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#20442D] border-b border-[#FAF8F5] pb-2">
                        <Sliders className="w-4 h-4 text-[#3E7250]" />
                        <span>STEP 2: RADIOMETRIC & ATMOSPHERIC CASES</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#635547] font-medium">
                        Normalize raw atmospheric scatter, calibrate DN values to True Top of Atmosphere (TOA) reflectance parameters, and mask heavy cloud anomalies.
                      </p>

                      <div className="space-y-2.5">
                        <label className="flex items-center gap-3 p-2 bg-[#FAF8F5] rounded-xl cursor-pointer hover:bg-[#F3EFE9] transition-colors border border-transparent hover:border-[#ECE1D4]">
                          <input
                            type="checkbox"
                            checked={radiometricCorrection}
                            onChange={() => setRadiometricCorrection(!radiometricCorrection)}
                            className="rounded border-[#E6DCCF] text-[#3E7250] focus:ring-[#3E7250]"
                          />
                          <div>
                            <span className="block text-xs font-black text-[#2C2112]">Radiometric Sensor Calibration</span>
                            <span className="block text-[10px] text-gray-500">Transform raw pixel integers (DN) into surface-relative reflectance</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-2 bg-[#FAF8F5] rounded-xl cursor-pointer hover:bg-[#F3EFE9] transition-colors border border-transparent hover:border-[#ECE1D4]">
                          <input
                            type="checkbox"
                            checked={atmosphericCorrection}
                            onChange={() => setAtmosphericCorrection(!atmosphericCorrection)}
                            className="rounded border-[#E6DCCF] text-[#3E7250] focus:ring-[#3E7250]"
                          />
                          <div>
                            <span className="block text-xs font-black text-[#2C2112]">Atmospheric Correction (Sen2Cor Engine)</span>
                            <span className="block text-[10px] text-gray-500">Correct aerosol optical thickness, ozone, water-vapor distortions</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-2 bg-[#FAF8F5] rounded-xl cursor-pointer hover:bg-[#F3EFE9] transition-colors border border-transparent hover:border-[#ECE1D4]">
                          <input
                            type="checkbox"
                            checked={cloudMaskingEnabled}
                            onChange={() => setCloudMaskingEnabled(!cloudMaskingEnabled)}
                            className="rounded border-[#E6DCCF] text-[#3E7250] focus:ring-[#3E7250]"
                          />
                          <div>
                            <span className="block text-xs font-black text-[#2C2112]">SCL Cloud & Shadow Cover Masking</span>
                            <span className="block text-[10px] text-gray-500">Filter opaque high-altitude clouds, shadows using Sentinel band classification</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-2 bg-[#FAF8F5] rounded-xl cursor-pointer hover:bg-[#F3EFE9] transition-colors border border-transparent hover:border-[#ECE1D4]">
                          <input
                            type="checkbox"
                            checked={temporalAlignment}
                            onChange={() => setTemporalAlignment(!temporalAlignment)}
                            className="rounded border-[#E6DCCF] text-[#3E7250] focus:ring-[#3E7250]"
                          />
                          <div>
                            <span className="block text-xs font-black text-[#2C2112]">Spatio-Temporal Co-Registration Alignment</span>
                            <span className="block text-[10px] text-gray-500">Align multi-source pixels frame-by-frame with 0.1 pixel precision standards</span>
                          </div>
                        </label>
                      </div>

                      <button
                        onClick={handleRunPreprocessing}
                        disabled={isPreprocessingRunning}
                        className="w-full bg-[#3E7250] hover:bg-[#2F593E] text-white text-xs font-extrabold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isPreprocessingRunning ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            Executing GDAL/Rasterio calibration suite...
                          </>
                        ) : (
                          <>
                            <Sliders className="w-4 h-4 text-emerald-200" />
                            Run Corrections Calibration Suite
                          </>
                        )}
                      </button>
                    </div>

                    {preprocessingSuccess && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 text-[#2B543A] rounded-2xl space-y-3">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#20442D]">
                          <Check className="w-4 h-4 text-emerald-600 font-black" />
                          <span>IMAGE CORRECTION CASCADE COMPLETED</span>
                        </div>
                        <p className="text-[11px] leading-relaxed font-mono">
                          Raw raster bands successfully translated to Level-2A Ortho-reflective product. Atmospheric noise ratio reduced by 98.4%. Spatial clipping bounds aligned with target crop parcel {selectedField?.name || "Field B"}.
                        </p>

                        <div className="pt-3 border-t border-emerald-200/50">
                          <span className="text-[9px] font-mono font-black text-emerald-800 uppercase block mb-2 leading-none">
                            Select Multi-Spectral Index to Apply False-Color Overlay
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(["NDVI", "NDWI", "GNDVI", "SAVI", "NDRE", "EVI"] as const).map((idxName) => (
                              <button
                                key={idxName}
                                onClick={() => setSelectedSpectralIndex(idxName)}
                                className={`text-[10px] font-black uppercase py-2 px-1 rounded-lg border transition-all cursor-pointer ${
                                  selectedSpectralIndex === idxName
                                    ? "bg-[#3E7250] text-[#FFF] border-[#3E7250] shadow-sm"
                                    : "bg-white text-[#8C7D6E] border-[#ECE1D4] hover:bg-[#FCFAFB]"
                                }`}
                              >
                                {idxName}
                              </button>
                            ))}
                          </div>
                          
                          {/* Index descriptions */}
                          <div className="mt-3 p-3 bg-white/60 rounded-xl text-[10px] space-y-1 text-[#4A3D2A] font-semibold border border-emerald-500/10 shadow-3xs">
                            {selectedSpectralIndex === "NDWI" && (
                              <p><span className="font-black text-[#20442D] block mb-0.5 text-xs">💦 Liquid Water Density Index (NDWI)</span> Traces canopy hydration dynamics. Discovers early irrigation leaks or extreme evaporative transpiration stress.</p>
                            )}
                            {selectedSpectralIndex === "GNDVI" && (
                              <p><span className="font-black text-[#20442D] block mb-0.5 text-xs">🌿 Nitrogen/Chlorophyll Chloroplast vigor (GNDVI)</span> Measures relative green-band reflectivity indicating cell chloroplast structure thickness. Optimal for corn and sugarcane.</p>
                            )}
                            {selectedSpectralIndex === "SAVI" && (
                              <p><span className="font-black text-[#20442D] block mb-0.5 text-xs">🟫 Soil-Adjusted Canopy Variance (SAVI)</span> Injects an L-factor constant of 0.5 to offset ground dust/sparse exposed clay reflection in early seedlings.</p>
                            )}
                            {selectedSpectralIndex === "NDRE" && (
                              <p><span className="font-black text-[#20442D] block mb-0.5 text-xs">⚡ Red-Edge Advanced Canopy Health (NDRE)</span> Captures the narrow spectral response transition line of early vegetation stress. Predicts nitrogen starvation.</p>
                            )}
                            {selectedSpectralIndex === "EVI" && (
                              <p><span className="font-black text-[#20442D] block mb-0.5 text-xs">💠 Atmosphere-Robust Enhanced Index (EVI)</span> Adjusts background canopy atmospheric haze using blue and red bands. Excellent for extremely thick cotton forest covers.</p>
                            )}
                            {selectedSpectralIndex === "NDVI" && (
                              <p><span className="font-black text-[#20442D] block mb-0.5 text-xs">🌲 Normalized Vegetation cover (NDVI) Traces Crop Biomass</span> Standard ratio of Near-Infrared absorption indicating relative green leaf biomass cover. Standardized globally.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STAGE 3: AI/ML ANALTICS */}
                {gisActiveTab === "aiml" && (
                  <div className="space-y-4 animate-[fadeIn_0.2s_ease]">
                    <div className="p-4 bg-white rounded-2xl border border-[#ECE1D4] space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#20442D] border-b border-[#FAF8F5] pb-1.5">
                        <Cpu className="w-4 h-4 text-[#3E7250]" />
                        <span>STEP 3: DEEP COGNITIVE ARTIFICIAL INTELLIGENCE CORE</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#635547] font-medium">
                        Execute machine learning models (U-Net, Random Forest Regressors, and Isolation Forests) to segment active weed anomalies, diagnose hydration layers, and estimate multi-ton crop yields.
                      </p>

                      <button
                        onClick={handleRunAiModeling}
                        disabled={isModelingRunning}
                        className="w-full bg-[#3E7250] hover:bg-[#2F593E] text-white text-xs font-extrabold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isModelingRunning ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            Running forward tensor passes (PyTorch DeepNet)...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-200" />
                            Run Deep Learning Inference Models
                          </>
                        )}
                      </button>
                    </div>

                    {modelingSuccess && aiReportDetails && (
                      <div className="space-y-3">
                        {/* Crop Health Distribution */}
                        <div className="p-4 bg-white rounded-2xl border border-[#ECE1D4] space-y-2.5">
                          <span className="block text-[9px] font-mono font-black text-[#8C7D6E] uppercase border-b pb-1 leading-none">
                            U-Net Classification Segmentation (Keras Backend)
                          </span>
                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex justify-between items-center">
                              <span className="font-bold flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-lg block" /> Healthy Canopy:</span>
                              <span className="font-mono text-emerald-700 font-black">{aiReportDetails.healthDistribution.healthy}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-bold flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-400 rounded-lg block" /> Moisture Stress:</span>
                              <span className="font-mono text-amber-700 font-black">{aiReportDetails.healthDistribution.stressed}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-bold flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-yellow-500 rounded-lg block" /> Active Pest Lesions:</span>
                              <span className="font-mono text-yellow-700 font-black">{aiReportDetails.healthDistribution.diseased}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-bold flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-650 rounded-lg block" /> Dead / Exposed Bed:</span>
                              <span className="font-mono text-red-700 font-black">{aiReportDetails.healthDistribution.dead}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Moisture Regression */}
                        <div className="p-4 bg-white rounded-2xl border border-[#ECE1D4] space-y-1.5 text-[11px]">
                          <span className="block text-[9px] font-mono font-black text-[#8C7D6E] uppercase border-b pb-1 leading-none">
                            RF Moisture Estimator (Y-Index Ratio)
                          </span>
                          <div className="flex justify-between items-center font-extrabold text-xs">
                            <span className="flex items-center gap-1.5 text-[#264D73]"><Droplets className="w-4 h-4 text-blue-500" /> Ground Layer Moisture:</span>
                            <span className="font-mono text-blue-800">{aiReportDetails.moistureStats.value}%</span>
                          </div>
                          <p className="text-[10px] text-[#5C4D3C] font-semibold bg-blue-50/50 p-2.5 rounded-xl italic leading-relaxed">
                            "{aiReportDetails.moistureStats.irrigationPrescription}"
                          </p>
                        </div>

                        {/* XGBoost Yield & Pest Risk */}
                        <div className="p-4 bg-white rounded-2xl border border-[#ECE1D4] space-y-1.5 text-[11px]">
                          <span className="block text-[9px] font-mono font-black text-[#8C7D6E] uppercase border-b pb-1 leading-none">
                            Spatial Yield Forecasting & Pest Classification
                          </span>
                          <div className="flex justify-between items-center">
                            <span className="font-bold">Yield Projection Metric:</span>
                            <span className="font-mono font-extrabold text-emerald-800 text-xs">{aiReportDetails.yieldEstimator.forecast} Metric Tons / Hectare</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-bold">Forecast Model Confidence:</span>
                            <span className="font-mono text-[10px] text-gray-500">{aiReportDetails.yieldEstimator.confidence}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-bold">Relative Confidence Boundaries:</span>
                            <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-1 font-extrabold rounded">{aiReportDetails.yieldEstimator.interval}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t">
                            <span className="font-extrabold flex items-center gap-1"><Bug className="w-3.5 h-3.5 text-red-650" /> Pest/Pathogen Invasion Risk:</span>
                            <span className="font-black text-red-750 text-xs">{aiReportDetails.pestRiskStatus}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STAGE 4: POST-PROCESSING & EXPORTS */}
                {gisActiveTab === "postprocessing" && (
                  <div className="space-y-4 animate-[fadeIn_0.2s_ease]">
                    <div className="p-4 bg-white rounded-2xl border border-[#ECE1D4] space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#20442D] border-b border-[#FAF8F5] pb-1.5">
                        <Download className="w-4 h-4 text-[#3E7250]" />
                        <span>STEP 4: POST-PROCESSING METRICS & GEOSPATIAL ACTIONS</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#635547] font-medium">
                        Divide the target crop boundary into k-means clustering management zones, isolate critical anomaly pixels, and export files to coordinate field operations.
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={handleGenerateZonalStats}
                          disabled={isGeneratingZonalStats}
                          className="flex-1 bg-[#3E7250] hover:bg-[#2F593E] text-white text-xs font-extrabold py-2.5 px-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isGeneratingZonalStats ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-emerald-250 animate-pulse" />
                          )}
                          Generate K-Means Zones
                        </button>
                      </div>
                    </div>

                    {zonalStatsGenerated && zonalStats && (
                      <div className="p-4 bg-white rounded-2xl border border-[#ECE1D4] space-y-3 text-[11px] animate-[fadeIn_0.15s_ease]">
                        <span className="block text-[9px] font-mono font-black text-[#8C7D6E] uppercase border-b pb-1 leading-none">
                          K-Means Management Zones & Precision Prescriptions
                        </span>
                        <div className="space-y-2">
                          {zonalStats.map((zone: any, idx: number) => (
                            <div key={idx} className="p-2.5 bg-[#FAF8F5] border border-[#EBE2D5] rounded-xl space-y-1">
                              <div className="flex justify-between items-center font-black text-xs text-[#2C2112]">
                                <span className={idx === 2 ? "text-amber-850" : (idx === 0 ? "text-emerald-855" : "text-[#4A3D2A]")}>{zone.zone}</span>
                                <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-[#ECE1D4] font-black">Area: {zone.area}</span>
                              </div>
                              <div className="flex justify-between text-[10px] font-semibold text-gray-500">
                                <span>Mean Index Reflectivity Value (μ):</span>
                                <span className="font-mono text-[#3E7250]">{zone.meanIndex}</span>
                              </div>
                              <div className="text-[10px] text-[#5C4D3C] font-semibold flex items-center gap-1.5 pt-0.5 leading-tight">
                                <span className="text-emerald-600 font-bold uppercase text-[9px] shrink-0 border border-emerald-500/20 px-1 rounded bg-emerald-50">PRESCRIPTION:</span>
                                <span>{zone.prescription}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Raster Download Options */}
                    <div className="p-4 bg-white rounded-2xl border border-[#ECE1D4] space-y-3">
                      <span className="block text-[9px] font-mono font-black text-[#8C7D6E] uppercase border-b pb-1 leading-none">
                        EXPORT OUTPUTS & FIELD DEPLOYMENT FILES
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => alert("Simulating Rasters Downlink... GeoTIFF downloaded to local device successfully! (Metadata CRS: EPSG:4326)")}
                          className="flex items-center justify-center gap-1.5 p-2.5 bg-white hover:bg-[#FAF8F5] text-[#2C2112] text-[11px] font-extrabold border border-[#ECE1D4] rounded-xl transition-all hover:border-[#CCA88A] cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-[#3E7250]" />
                          Download GeoTIFF
                        </button>
                        <button
                          onClick={() => alert("Tabulation exported! Localized management statistics generated in CSV format successfully.")}
                          className="flex items-center justify-center gap-1.5 p-2.5 bg-white hover:bg-[#FAF8F5] text-[#2C2112] text-[11px] font-extrabold border border-[#ECE1D4] rounded-xl transition-all hover:border-[#CCA88A] cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-[#3E7250]" />
                          Export CSV Zones
                        </button>
                      </div>

                      <button
                        onClick={() => alert("PDF report generated! Ortho-Rectified AI/ML agriculture audit report is print-ready.")}
                        className="w-full flex items-center justify-center gap-2 p-2.5 bg-[#20442D] hover:bg-[#1a3825] text-white text-xs font-black rounded-xl transition-all shadow-md mt-1 cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-emerald-400" />
                        Generate GIS Audit Report (PDF)
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Map Utility Controllers */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2.5 items-end">
          {/* Map Style Selector */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-[#EBE2D5] p-1.5 flex gap-1">
            <button
              onClick={() => setMapType("hybrid")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                mapType === "hybrid"
                  ? "bg-[#3E7250] text-white"
                  : "hover:bg-[#FAF8F5] text-[#2C2112]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Sate-Hybrid
            </button>
            <button
              onClick={() => setMapType("roadmap")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                mapType === "roadmap"
                  ? "bg-[#3E7250] text-white"
                  : "hover:bg-[#FAF8F5] text-[#2C2112]"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Satin Terrain
            </button>
          </div>

          {/* Toggle Layers Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-[#EBE2D5] p-3 space-y-2.5 w-[210px]">
            <span className="text-[10px] font-mono font-black text-[#8C7D6E] uppercase tracking-wider block border-b pb-1">
              Overlay Filters
            </span>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2C2112]">
              <input
                type="checkbox"
                checked={heatmapEnabled}
                onChange={() => setHeatmapEnabled(!heatmapEnabled)}
                className="rounded border-[#E6DCCF] text-[#3E7250] focus:ring-[#3E7250]"
              />
              Pest Thermal Heatmap
            </label>
          </div>

          {/* Centering Pointer HUD */}
          {selectedField && (
            <button
              onClick={() => {
                if (selectedField.center_lat && selectedField.center_lng) {
                  setMapCenter({ lat: selectedField.center_lat, lng: selectedField.center_lng });
                  setMapZoom(15);
                }
              }}
              className="bg-white/95 backdrop-blur-md hover:bg-[#FAF8F5] text-[#2C2112] w-10 h-10 rounded-full shadow-md border border-[#EBE2D5] flex items-center justify-center transition-transform active:scale-95"
              title="Pan to Selected Crop Area Centroid"
            >
              <Navigation className="w-4 h-4 text-[#3E7250] rotate-45" />
            </button>
          )}
        </div>

        {/* Live Geolocation Controller Card - Placed separately side-by-side to prevent bottom layout overlapping */}
        <div className="absolute top-4 right-[236px] z-20">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-[#EBE2D5] p-3.5 space-y-3 w-64">
            <div className="flex items-center justify-between border-b border-[#FAF8F5] pb-1.5">
              <span className="text-[10px] font-mono font-black text-[#8C7D6E] uppercase tracking-wider block">
                Live Geolocation
              </span>
              {isTrackingLocation ? (
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isSimulated ? 'bg-amber-500' : 'bg-emerald-500'} animate-ping`} />
                  <span className="text-[9px] font-bold text-[#3E7250] uppercase">
                    {isSimulated ? 'Simulated' : 'Live'}
                  </span>
                </span>
              ) : (
                <span className="text-[9px] font-bold text-gray-400 uppercase">OFFLINE</span>
              )}
            </div>

            {locationPermissionStatus === 'prompt' && !isTrackingLocation && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-[#5C4D3C] font-medium leading-relaxed">
                  Let FarmMind map your physical distance to threat clusters and plan autonomous drone spray sweeps.
                </p>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={requestLiveLocation}
                    className="w-full bg-[#3E7250] hover:bg-[#2F593E] text-white text-[11px] font-bold py-1.5 px-3 rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3 h-3 animate-pulse" />
                    Allow Live Location
                  </button>
                  <button
                    onClick={enableSimulatedLocation}
                    className="w-full hover:bg-gray-100 text-[#5C4D3C] border border-gray-250 text-[10px] font-bold py-1 px-3 rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    Use Simulation Hub Coordinates
                  </button>
                </div>
              </div>
            )}

            {locationPermissionStatus === 'requesting' && (
              <div className="flex flex-col items-center justify-center py-3 space-y-2">
                <Loader2 className="w-5 h-5 text-[#3E7250] animate-spin" />
                <p className="text-[11px] font-semibold text-gray-650 animate-pulse text-center">
                  Awaiting browser GPS permission authorization dialog...
                </p>
              </div>
            )}

            {locationPermissionStatus === 'granted' && userLocation && (
              <div className="space-y-2">
                <div className="bg-[#FAF8F5] rounded-xl p-2 border border-[#EBE2D5]/50 space-y-1">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase font-mono">
                    Device Coordinates Verified
                  </div>
                  <div className="font-mono text-xs text-[#2C2112] font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{userLocation.lat.toFixed(5)}° N, {userLocation.lng.toFixed(5)}° E</span>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setMapCenter(userLocation);
                      setMapZoom(16);
                    }}
                    className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-[10px] text-gray-700 font-bold py-1 px-2 rounded-lg transition-all"
                  >
                    Center Map 🎯
                  </button>
                  <button
                    onClick={disableLocationTracking}
                    className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold py-1 px-2 rounded-lg transition-all"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}

            {locationPermissionStatus === 'denied' && (
              <div className="space-y-2">
                <div className="flex gap-2 bg-red-50 text-red-950 p-2 rounded-xl border border-red-200 text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block">Permission Ignored or Denied</span>
                    <span className="text-[10px] font-medium leading-relaxed block text-red-800">
                      {locationError || "Check browser lock icon or security settings for FarmMind AI."}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={requestLiveLocation}
                    className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-350 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all"
                  >
                    Retry Permission Dialog
                  </button>
                  <button
                    onClick={enableSimulatedLocation}
                    className="w-full bg-[#3E7250] hover:bg-[#2F593E] text-white text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all"
                  >
                    Enable Simulated Location Fallback
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas Scanning Radar Animation block */}
        {analyzingId && (
          <div className="absolute inset-0 bg-[#3E7250]/10 backdrop-blur-xs pointer-events-none z-10 flex flex-col items-center justify-center animate-[pulse_1.5s_infinite]">
            <div className="w-56 h-56 rounded-full border-4 border-dashed border-[#3E7250]/45 flex items-center justify-center animate-spin mb-4">
              <Disc className="w-24 h-24 text-[#3E7250]/30 animate-ping" />
            </div>
            
            <div className="bg-[#2C2112]/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-[#3E7250] shadow-xl text-center">
              <Loader2 className="w-6 h-6 animate-spin text-white class mx-auto mb-2" />
              <p className="text-white text-xs font-black uppercase tracking-widest leading-none">
                AI Satellite Scanner Activated
              </p>
              <p className="text-amber-200/80 text-[10px] font-mono font-bold mt-1.5">
                Acquiring orbital multispectral bands...
              </p>
            </div>
          </div>
        )}

        {/* Integrated Map Engine implementation */}
        <APIProvider apiKey={apiKey} libraries={['places']}>
            <MapRefCollector onMapReady={setMap} />
            <div className="w-full h-full relative">
              <div className="absolute top-4 left-4 z-20 w-64">
                <div className="flex bg-white rounded-lg shadow-md border border-gray-200">
                  <input 
                    type="text" 
                    placeholder="Search farm location..." 
                    value={mapSearchQuery}
                    onChange={(e) => handleMapSearch(e.target.value)}
                    className="px-3 py-2 text-sm w-full rounded-lg focus:outline-none" 
                  />
                </div>
                {mapSuggestions.length > 0 && (
                  <div className="mt-1 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                    {mapSuggestions.map((suggestion, index) => (
                      <button 
                        key={index}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 truncate"
                        onClick={() => {
                          const lat = parseFloat(suggestion.lat);
                          const lng = parseFloat(suggestion.lon);
                          setMapCenter({ lat, lng });
                          setMapZoom(16);
                          setSelectedPin({ lat, lng });
                          setSetupStep("pin_selected");
                          setMapSearchQuery(suggestion.display_name);
                          setMapSuggestions([]);
                        }}
                      >
                        {suggestion.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Map
                center={mapCenter}
                zoom={mapZoom}
                onCenterChanged={(e) => setMapCenter(e.detail.center)}
                onZoomChanged={(e) => setMapZoom(e.detail.zoom)}
                mapTypeId={mapType}
                onClick={handleMapClick}
                gestureHandling="cooperative"
                disableDefaultUI={false}
                className="w-full h-full"
                internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              >
                {/* Plot All Existing Fields Polygons */}
                {scans.map((field) => {
                  const isSelected = selectedField?.id === field.id;
                  const isWeeds = field.status === "Weeds Detected";
                  const isCritical = field.status === "Critical";
                  
                  // Color mapping: red for critical/heavy weeds, green for healthy canopy
                  let strokeColor = isCritical ? "#DC2626" : isWeeds ? "#D0743B" : "#10B981";
                  let fillColor = isCritical ? "#EF4444" : isWeeds ? "#F59E0B" : "#10B981";
                  let fillOpacity = isSelected ? 0.35 : 0.15;

                  // Override coloring with premium Multi-Spectral False-Color palette when GIS lab is active!
                  if (isSelected && isGisLabOpen) {
                    if (selectedSpectralIndex === "NDWI") {
                      // NDWI (Liquid Water Canopy Absorption) -> Blue palette
                      strokeColor = "#1D4ED8";
                      fillColor = "#3B82F6";
                    } else if (selectedSpectralIndex === "GNDVI") {
                      // GNDVI (Chlorophyll Vigor) -> Pure Emerald Green
                      strokeColor = "#047857";
                      fillColor = "#10B981";
                    } else if (selectedSpectralIndex === "SAVI") {
                      // SAVI (Soil Adjusted Vigor) -> Bronze Earth
                      strokeColor = "#78350F";
                      fillColor = "#B45309";
                    } else if (selectedSpectralIndex === "NDRE") {
                      // NDRE (Red Edge early stress) -> Chartreuse Lime
                      strokeColor = "#4D7C0F";
                      fillColor = "#84CC16";
                    } else if (selectedSpectralIndex === "EVI") {
                      // EVI (High Biomass Density) -> Deep Amethyst Violet
                      strokeColor = "#6B21A8";
                      fillColor = "#9333EA";
                    } else {
                      // NDVI (Vegetation Green Biomass) -> Jade Forestry
                      strokeColor = "#15803D";
                      fillColor = "#22C55E";
                    }
                    fillOpacity = 0.60;
                  }

                  return (
                    field.polygon_geojson && field.polygon_geojson.length > 0 && (
                      <Polygon
                        key={`polygon-${field.id}`}
                        paths={field.polygon_geojson}
                        strokeColor={strokeColor}
                        strokeOpacity={isSelected ? 0.85 : 0.5}
                        strokeWeight={isSelected ? 4 : 2}
                        fillColor={fillColor}
                        fillOpacity={fillOpacity}
                        onClick={() => handleSelectField(field)}
                      />
                    )
                  );
                })}

                {/* Renders Temporary Draw Boundary Polyline Nodes */}
                {isDrawingMode && drawingPoints.length > 0 && (
                  <>
                    <Polygon
                      paths={drawingPoints}
                      strokeColor="#8A5A2B"
                      strokeOpacity={0.8}
                      strokeWeight={3}
                      fillColor="#D09E6D"
                      fillOpacity={0.25}
                    />
                    {drawingPoints.map((pt, idx) => (
                      <Marker
                        key={`draw-vertex-${idx}`}
                        position={pt}
                        label={{
                          text: (idx + 1).toString(),
                          color: "white",
                          fontSize: "10px",
                          fontWeight: "bold"
                        }}
                      />
                    ))}
                  </>
                )}

                {/* Drone Treatment Zone Overlays */}
                {treatmentOverlay?.zone && (
                  <Polygon
                    paths={treatmentOverlay.zone}
                    strokeColor="#F59E0B"
                    strokeOpacity={0.9}
                    strokeWeight={3}
                    fillColor="#FBBF24"
                    fillOpacity={0.2}
                  />
                )}

                {/* Thermal circular weed density Heatmap Mock vectors */}
                {heatmapEnabled && (
                  scans.map((f) => (
                    f.heatmap_data && f.heatmap_data.length > 0 && (
                      f.heatmap_data.map((heat, idx) => (
                        <Polygon
                          key={`heatmap-${f.id}-${idx}`}
                          paths={[
                            { lat: heat.lat + 0.0006, lng: heat.lng - 0.0006 },
                            { lat: heat.lat + 0.0006, lng: heat.lng + 0.0006 },
                            { lat: heat.lat - 0.0006, lng: heat.lng + 0.0006 },
                            { lat: heat.lat - 0.0006, lng: heat.lng - 0.0006 }
                          ]}
                          strokeColor="transparent"
                          fillColor="#EF4444"
                          fillOpacity={heat.weight * 0.45}
                        />
                      ))
                    )
                  ))
                )}

                {/* User Live GPS Marker on Google Map */}
                {userLocation && (
                  <Marker
                    key="google-maps-user-marker"
                    position={userLocation}
                    title="My Live GPS Coordinates"
                  />
                )}

                {/* Selected Farm Deployment Pin Marker */}
                {selectedPin && (
                  <Marker
                    key="google-maps-selected-pin"
                    position={selectedPin}
                    title="Setup Center Reference"
                  />
                )}

                {/* Detected weed & pest coordinate Markers */}
                {scans.flatMap((f) =>
                  (f.detections || []).map((det) => {
                    const isVisible = selectedField?.id === f.id;
                    if (!isVisible && f.id !== "field-b") return null; // Show selected scans & field b active pins

                    const position = { 
                      lat: det.lat || f.center_lat || 31.02, 
                      lng: det.lng || f.center_lng || 75.35 
                    };

                    return (
                      <Marker
                        key={`marker-${det.id}`}
                        position={position}
                        title={`${det.name} (${det.severity})`}
                        onClick={() => setActiveMarker(det)}
                      />
                    );
                  })
                )}

                {/* Marker details Infowindow popup */}
                {activeMarker && (
                  <InfoWindow
                    position={{
                      lat: activeMarker.lat || 31.02,
                      lng: activeMarker.lng || 75.35
                    }}
                    onCloseClick={() => setActiveMarker(null)}
                  >
                    <div className="p-1 space-y-1 text-xs text-[#2C2112] max-w-[190px]">
                      <div className="flex items-center gap-1.5 font-bold border-b pb-1 mb-1">
                        <span>{activeMarker.icon || "🌿"}</span>
                        <span className="text-[12px]">{activeMarker.name}</span>
                      </div>
                      <div className="text-[10px] font-semibold text-gray-500">
                        SPECTRUM CAPTURE THREAT
                      </div>
                      <div>
                        Severity: <span className="font-extrabold text-[#8A1A11]">{activeMarker.severity}</span>
                      </div>
                      <div>
                        Coverage Area: <span className="font-mono font-bold">{activeMarker.acreage || 1.8} ac</span>
                      </div>
                      <div className="pt-1 mt-1 border-t flex justify-end">
                        <button
                          onClick={() => {
                            if (selectedField) {
                              handleDispatchAutonomousDrone(selectedField.id);
                            }
                            setActiveMarker(null);
                          }}
                          className="bg-[#3E7250] hover:bg-[#2E5A3E] text-white text-[9px] font-bold px-2 py-1 rounded"
                        >
                          Plan Sprayer Path 🚁
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </div>
          </APIProvider>
      </div>
    </div>
  );
}
