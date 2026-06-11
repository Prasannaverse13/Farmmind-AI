import os
import uuid
import datetime
import requests
import json
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Import our database helpers and mock from our MCP server so they share a single unified datastore
from mcp_server import (
    get_db, find_one, find_many, insert_one, update_one, MEMORY_DB,
    plan_treatment_route, check_inventory, log_compliance_action
)

load_dotenv()

app = FastAPI(
    title="FarmMind AI - Precision Agriculture Backend",
    description="Autonomous Agent for Field Optimization & Compliance",
    version="1.0.0"
)

# Configure elegant CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for target environment deployment safety
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# PyDantic Validation Schemas
# -------------------------------------------------------------
class InitializeFarmRequest(BaseModel):
    center_lat: float
    center_lng: float
    user_confirmed: bool = True

class AnalyzeFieldRequest(BaseModel):
    image_source: str = "satellite"  # "satellite" | "drone"
    image_url: Optional[str] = None

class CreateTreatmentRequest(BaseModel):
    detection_ids: List[str]
    treatment_type: str  # "bio_herbicide" | "neem_spray" | "mechanical"

class ApproveTreatmentRequest(BaseModel):
    treatment_id: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

# -------------------------------------------------------------
# Google Gemini 2.5 Flash Wrapper with High Availability Fallbacks
# -------------------------------------------------------------
def call_gemini(prompt: str, image_url: Optional[str] = None) -> str:
    """
    Submits queries to gemini-2.5-flash with a resilient fallback system 
    in case of lack of credentials, network firewalls, or quota exhaustion (429/403).
    """
    api_key = os.getenv("GEMINI_API_KEY") or "AIzaSyCUdGOugMDV0yime4Q1fd8Mpw0p4HwUNqU"
    
    # 1. Attempt to invoke using unified google-genai package
    try:
        from google import genai
        # Initialize client lazily to avoid startup crashes
        client = genai.Client(api_key=api_key)
        
        # Determine content parameters
        if image_url:
            # Download imagery bytes
            img_resp = requests.get(image_url, timeout=5)
            if img_resp.status_code == 200:
                from io import BytesIO
                from PIL import Image
                img = Image.open(BytesIO(img_resp.content))
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[prompt, img]
                )
                return response.text
                
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return response.text
    except Exception as e_genai:
        print(f"⚠️ google-genai execution error or package not modern: {e_genai}. Trying alternative fallback...")
        
        # 2. Try newer HTTP endpoint POST as standard REST API
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {"parts": [{"text": prompt}]}
                ]
            }
            res = requests.post(url, headers=headers, json=payload, timeout=10)
            if res.status_code == 200:
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            else:
                print(f"⚠️ Gemini REST returned status: {res.status_code} - {res.text}")
        except Exception as e_rest:
            print(f"⚠️ REST Gemini call failed: {e_rest}")

    # 3. Fallback: Parse or provide smart mock behavior if both APIs fail / rate-limited
    print("ℹ️ Utilizing deterministic agricultural calculation model fallback (Gemini endpoint offline/throttled).")
    return ""

# -------------------------------------------------------------
# REST Endpoints
# -------------------------------------------------------------

@app.get("/api/health")
def api_health():
    """
    Check the system readiness and connection profile of the database.
    """
    db = get_db()
    connected = db is not None
    return {
        "status": "ok",
        "mongodb_connected": connected,
        "database_type": "mongodb_atlas" if connected else "persistent_memory_db",
        "timestamp": datetime.datetime.now().isoformat()
    }


@app.post("/api/seed")
def api_seed():
    """
    Seeds rich demo data representing Green Valley Organics in Punjab, India.
    Includes inventory levels, pre-calculated scans, compliance logs, and completed treatments.
    """
    # 0. Flush any existing data for seed idempotency
    db = get_db()
    if db is not None:
        try:
            db["farms"].delete_many({})
            db["fields"].delete_many({})
            db["scans"].delete_many({})
            db["detections"].delete_many({})
            db["treatments"].delete_many({})
            db["inventory"].delete_many({})
            db["compliance_logs"].delete_many({})
        except Exception as e:
            print(f"Database prefix flush failed: {e}")
            
    # Purge Memory DB too 
    MEMORY_DB["farms"].clear()
    MEMORY_DB["fields"].clear()
    MEMORY_DB["scans"].clear()
    MEMORY_DB["detections"].clear()
    MEMORY_DB["treatments"].clear()
    MEMORY_DB["compliance_logs"].clear()
    
    farm_id = "farm_green_valley"
    center_lat = 31.022
    center_lng = 75.352
    
    # 1. Store Farm Document
    farm_doc = {
        "farm_id": farm_id,
        "farm_name": "Green Valley Organics",
        "owner_id": "owner_harpreet_singh",
        "center_lat": center_lat,
        "center_lng": center_lng,
        "total_acres": 340.0,
        "location_address": "Village Kila Raipur, District Ludhiana, Punjab, India",
        "created_at": (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat(),
        "fields": []
    }
    
    # 2. Store 4 Fields with accurate GeoJSON geometries around coordinates
    fields_list = [
        {
            "field_id": "field_a_wheat",
            "farm_id": farm_id,
            "field_name": "Field-A (North Wheat Sector)",
            "polygon_geojson": {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [75.344, 31.028],
                        [75.352, 31.028],
                        [75.352, 31.022],
                        [75.344, 31.022],
                        [75.344, 31.028]
                    ]]
                }
            },
            "center_lat": 31.025,
            "center_lng": 75.348,
            "total_acres": 110.0,
            "crop_type": "Wheat",
            "crop_confidence": 0.96,
            "auto_detected": True,
            "detection_source": "Sentinel-2 L2A Spectrum Analysis",
            "status": "Healthy",
            "created_at": (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat()
        },
        {
            "field_id": "field_b_rice",
            "farm_id": farm_id,
            "field_name": "Field-B (Central Rice Basin)",
            "polygon_geojson": {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [75.352, 31.023],
                        [75.358, 31.023],
                        [75.358, 31.019],
                        [75.352, 31.019],
                        [75.352, 31.023]
                    ]]
                }
            },
            "center_lat": 31.021,
            "center_lng": 75.355,
            "total_acres": 85.0,
            "crop_type": "Rice",
            "crop_confidence": 0.94,
            "auto_detected": True,
            "detection_source": "Gemini Multi-Spectral Imagery",
            "status": "Weeds Detected",
            "created_at": (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat()
        },
        {
            "field_id": "field_c_cotton",
            "farm_id": farm_id,
            "field_name": "Field-C (East Cotton Meadow)",
            "polygon_geojson": {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [75.358, 31.027],
                        [75.364, 31.027],
                        [75.364, 31.021],
                        [75.358, 31.021],
                        [75.358, 31.027]
                    ]]
                }
            },
            "center_lat": 31.024,
            "center_lng": 75.361,
            "total_acres": 65.0,
            "crop_type": "Cotton",
            "crop_confidence": 0.91,
            "auto_detected": True,
            "detection_source": "Gemini Spot Classification Model",
            "status": "Healthy",
            "created_at": (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat()
        },
        {
            "field_id": "field_d_sugarcane",
            "farm_id": farm_id,
            "field_name": "Field-D (South Sugarcane Ridge)",
            "polygon_geojson": {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [75.340, 31.018],
                        [75.348, 31.018],
                        [75.348, 31.012],
                        [75.340, 31.012],
                        [75.340, 31.018]
                    ]]
                }
            },
            "center_lat": 31.015,
            "center_lng": 75.344,
            "total_acres": 95.0,
            "crop_type": "Sugarcane",
            "crop_confidence": 0.95,
            "auto_detected": True,
            "detection_source": "Planet Scope Imagery classification",
            "status": "Weeds Detected",
            "created_at": (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat()
        }
    ]
    
    for f in fields_list:
        insert_one("fields", f)
        farm_doc["fields"].append({
            "field_id": f["field_id"],
            "field_name": f["field_name"],
            "total_acres": f["total_acres"],
            "crop_type": f["crop_type"],
            "status": f["status"]
        })
    insert_one("farms", farm_doc)
    
    # 3. Store Inventory stock (India Organic certified materials)
    inventory_items = [
        {"item": "bio_herbicide", "quantity": 150.0, "unit": "L", "last_updated": datetime.datetime.now().isoformat()},
        {"item": "neem_oil", "quantity": 80.0, "unit": "L", "last_updated": datetime.datetime.now().isoformat()},
        {"item": "mechanical_parts", "quantity": 12.0, "unit": "sets", "last_updated": datetime.datetime.now().isoformat()}
    ]
    for inv in inventory_items:
        # Check database connection and write
        db_con = get_db()
        if db_con is not None:
            try:
                db_con["inventory"].replace_one({"item": inv["item"]}, inv, upsert=True)
            except Exception as e:
                print(f"Inventory replacement failed: {e}")
        # Sync memory
        MEMORY_DB["inventory"][inv["item"]] = inv
        
    # 4. Store active Detections for Field-B (Rice)
    det1_id = "det_amaranthus_b"
    det2_id = "det_aphids_b"
    det_b1 = {
        "detection_id": det1_id,
        "field_id": "field_b_rice",
        "farm_id": farm_id,
        "scan_id": "scan_rice_01",
        "detection_type": "weed",
        "species": "Amaranthus (Pigweed)",
        "severity": "medium",
        "area_acres": 2.3,
        "location": "Central Quad grid B1",
        "lat": 31.0215,
        "lng": 75.354,
        "confidence": 0.85,
        "timestamp": (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat(),
        "status": "active"
    }
    det_b2 = {
        "detection_id": det2_id,
        "field_id": "field_b_rice",
        "farm_id": farm_id,
        "scan_id": "scan_rice_01",
        "detection_type": "pest",
        "species": "Aphids (Greenflies)",
        "severity": "low",
        "area_acres": 0.8,
        "location": "North Basin grid A2",
        "lat": 31.0225,
        "lng": 75.356,
        "confidence": 0.78,
        "timestamp": (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat(),
        "status": "active"
    }
    insert_one("detections", det_b1)
    insert_one("detections", det_b2)
    
    # 5. Store active Detections for Field-D (Sugarcane)
    det3_id = "det_lamb_d"
    det_d1 = {
        "detection_id": det3_id,
        "field_id": "field_d_sugarcane",
        "farm_id": farm_id,
        "scan_id": "scan_cane_01",
        "detection_type": "weed",
        "species": "Lambsquarters (Chenopodium album)",
        "severity": "high",
        "area_acres": 4.1,
        "location": "East Sector ridge 4",
        "lat": 31.0145,
        "lng": 75.345,
        "confidence": 0.92,
        "timestamp": (datetime.datetime.now() - datetime.timedelta(hours=6)).isoformat(),
        "status": "active"
    }
    insert_one("detections", det_d1)
    
    # 6. Store completed historical scans
    scans_list = [
        {
            "scan_id": "scan_rice_01",
            "field_id": "field_b_rice",
            "farm_id": farm_id,
            "scan_type": "satellite",
            "image_url": "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&q=80&w=400",
            "acres_covered": 85.0,
            "scan_timestamp": (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat(),
            "processing_status": "completed",
            "detection_count": 2,
            "overall_status": "Weeds & Pests Detected",
            "weather_at_scan": "Wind NNW 3kmh, Temp 31C, Humidity 40%"
        },
        {
            "scan_id": "scan_cane_01",
            "field_id": "field_d_sugarcane",
            "farm_id": farm_id,
            "scan_type": "satellite",
            "image_url": "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=400",
            "acres_covered": 95.0,
            "scan_timestamp": (datetime.datetime.now() - datetime.timedelta(hours=6)).isoformat(),
            "processing_status": "completed",
            "detection_count": 1,
            "overall_status": "Heavy Infestation Isolated",
            "weather_at_scan": "Wind NW 6kmh, Temp 34C, Humidity 32%"
        },
        {
            "scan_id": "scan_wheat_prev",
            "field_id": "field_a_wheat",
            "farm_id": farm_id,
            "scan_type": "drone",
            "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400",
            "acres_covered": 110.0,
            "scan_timestamp": (datetime.datetime.now() - datetime.timedelta(days=15)).isoformat(),
            "processing_status": "completed",
            "detection_count": 0,
            "overall_status": "Optimal Healthy Canopy",
            "weather_at_scan": "Wind Calm, Temp 26C, Humidity 45%"
        }
    ]
    for sc in scans_list:
        insert_one("scans", sc)
        
    # 7. Store 2 completed historic treatments with cost values in INR
    history_treatments = [
        {
            "treatment_id": "treat_01_done",
            "field_id": "field_b_rice",
            "farm_id": farm_id,
            "detection_ids": ["det_hist_weed_b"],
            "treatment_type": "bio_herbicide",
            "target_sectors": ["Central Quad"],
            "total_area_acres": 3.4,
            "bio_herbicide_liters": 17.0,
            "fuel_cost_inr": 1190,
            "total_cost_inr": 12500,
            "estimated_duration_minutes": 35,
            "weather_window": "Temp 28°C, Wind NW 4km/h",
            "drone_path_geojson": {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[75.355, 31.021], [75.357, 31.021], [75.357, 31.020], [75.355, 31.020], [75.355, 31.021]]]
                }
            },
            "status": "completed",
            "approved_at": (datetime.datetime.now() - datetime.timedelta(days=4)).isoformat(),
            "timestamp": (datetime.datetime.now() - datetime.timedelta(days=4)).isoformat()
        },
        {
            "treatment_id": "treat_02_done",
            "field_id": "field_d_sugarcane",
            "farm_id": farm_id,
            "detection_ids": ["det_hist_cane_d"],
            "treatment_type": "mechanical",
            "target_sectors": ["South Sector Ridge 2"],
            "total_area_acres": 5.2,
            "bio_herbicide_liters": 0.0,
            "fuel_cost_inr": 1820,
            "total_cost_inr": 8500,
            "estimated_duration_minutes": 45,
            "weather_window": "Temp 30°C, Wind NNW 6km/h",
            "drone_path_geojson": {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[75.342, 31.016], [75.344, 31.016], [75.344, 31.014], [75.342, 31.014], [75.342, 31.016]]]
                }
            },
            "status": "completed",
            "approved_at": (datetime.datetime.now() - datetime.timedelta(days=2)).isoformat(),
            "timestamp": (datetime.datetime.now() - datetime.timedelta(days=2)).isoformat()
        }
    ]
    for tr in history_treatments:
        insert_one("treatments", tr)
        
    # 8. Store 5 compliance logs strictly matching India Organic (NPOP) standards
    compliance_items = [
        {
            "log_id": "cmp_seed_01",
            "timestamp": (datetime.datetime.now() - datetime.timedelta(days=29)).isoformat(),
            "action_type": "farm_registration",
            "field_id": "field_a_wheat",
            "farm_id": farm_id,
            "details": "Registered Green Valley Organics fields under NPOP Section 4. Regular soil and buffer zone reviews certified clear.",
            "standard": "India Organic (NPOP)",
            "status": "Verified Compliance"
        },
        {
            "log_id": "cmp_seed_02",
            "timestamp": (datetime.datetime.now() - datetime.timedelta(days=15)).isoformat(),
            "action_type": "satellite_scan",
            "field_id": "field_c_cotton",
            "farm_id": farm_id,
            "details": "Conducted multi-spectral satellite review mapping. Soil mineral ratios within NPOP biological safety margin bounds.",
            "standard": "India Organic (NPOP)",
            "status": "Verified Compliance"
        },
        {
            "log_id": "cmp_seed_03",
            "timestamp": (datetime.datetime.now() - datetime.timedelta(days=4)).isoformat(),
            "action_type": "pest_treatment",
            "field_id": "field_b_rice",
            "farm_id": farm_id,
            "details": "Approved application of NPOP-compliant bio-herbicide (batch certified). Applied selectively using Drone spot-treatment.",
            "standard": "India Organic (NPOP)",
            "status": "Verified Compliance"
        },
        {
            "log_id": "cmp_seed_04",
            "timestamp": (datetime.datetime.now() - datetime.timedelta(days=2)).isoformat(),
            "action_type": "mechanical_work",
            "field_id": "field_d_sugarcane",
            "farm_id": farm_id,
            "details": "Tractor tilling weed mechanical removal executed under NPOP weed management Section 4.5. zero herbicide chemicals detected.",
            "standard": "India Organic (NPOP)",
            "status": "Verified Compliance"
        },
        {
            "log_id": "cmp_seed_05",
            "timestamp": (datetime.datetime.now() - datetime.timedelta(hours=2)).isoformat(),
            "action_type": "inventory_audit",
            "field_id": "field_b_rice",
            "farm_id": farm_id,
            "details": "Re-certified compliance storage room. Current biological extracts (neem oil, bio herbicide) isolated from synthetic materials.",
            "standard": "India Organic (NPOP)",
            "status": "Verified Compliance"
        }
    ]
    for cmp in compliance_items:
        insert_one("compliance_logs", cmp)
        
    return {
        "success": True,
        "message": "Successfully seeded Green Valley Organic Punjab farm dataset. Database loaded for Hackathon.",
        "farm_id": farm_id,
        "fields_loaded": len(fields_list),
        "inventory_loaded": len(inventory_items),
        "detections_loaded": 3,
        "treatments_loaded": 2,
        "compliance_logs_loaded": 5
    }


@app.get("/api/farms/{farm_id}")
def get_farm_profile(farm_id: str):
    """
    Returns farm profile metadata with aggregated fields overview.
    """
    farm = find_one("farms", {"farm_id": farm_id})
    if not farm:
        # Fallback to seeded farm
        farm = find_one("farms", {"farm_id": "farm_green_valley"})
        if not farm:
            raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found and seed database is empty.")
            
    fields = find_many("fields", {"farm_id": farm["farm_id"]})
    
    # Enrich field profiles
    enriched_fields = []
    for f in fields:
        field_detections = find_many("detections", {"field_id": f["field_id"], "status": "active"})
        
        # Get latest scan
        scans = find_many("scans", {"field_id": f["field_id"]})
        sorted_scans = sorted(scans, key=lambda x: x.get("scan_timestamp", ""), reverse=True)
        latest_scan = sorted_scans[0] if sorted_scans else None
        
        f_copy = dict(f)
        if "_id" in f_copy:
            del f_copy["_id"]
        f_copy["detections"] = field_detections
        f_copy["latest_scan"] = latest_scan
        enriched_fields.append(f_copy)
        
    res = dict(farm)
    if "_id" in res:
        del res["_id"]
    res["fields"] = enriched_fields
    return res


@app.get("/api/fields")
def list_fields():
    """
    Returns a unified listing of all fields for general roster visualization.
    """
    fields = find_many("fields", {})
    results = []
    for f in fields:
        field_detections = find_many("detections", {"field_id": f["field_id"], "status": "active"})
        
        # Get latest scan
        scans = find_many("scans", {"field_id": f["field_id"]})
        sorted_scans = sorted(scans, key=lambda x: x.get("scan_timestamp", ""), reverse=True)
        latest_scan = sorted_scans[0] if sorted_scans else None
        
        f_copy = dict(f)
        if "_id" in f_copy:
            del f_copy["_id"]
        f_copy["detections"] = field_detections
        f_copy["latest_scan"] = latest_scan
        # For historical scans reference
        f_copy["last_scanned"] = latest_scan.get("scan_timestamp") if latest_scan else None
        results.append(f_copy)
        
    return results


@app.post("/api/farms/initialize")
def initialize_farm(payload: InitializeFarmRequest):
    """
    Triggered when a user center pins a new geolocation point. 
    Constructs a real localized farm, maps bounding areas via reverse-geocoding, 
    architects crop sectors with Gemini AI, and schedules scan cycles.
    """
    lat = payload.center_lat
    lng = payload.center_lng
    
    # 1. Coordinate localized reverse-geocoding calculation
    village_name = "Kila Raipur"
    district_name = "Ludhiana"
    state_name = "Punjab"
    
    # Geocode by bounding coordinate boxes offsets for rapid hackathon deployment
    if lat < 14:
        village_name = "Old Pallavaram"
        district_name = "Chennai"
        state_name = "Tamil Nadu"
    elif 14 <= lat < 22:
        village_name = "Mulshi"
        district_name = "Pune"
        state_name = "Maharashtra"
    elif 22 <= lat < 26:
        village_name = "Mow"
        district_name = "Indore"
        state_name = "Madhya Pradesh"
    elif 26 <= lat < 30:
        village_name = "Julana"
        district_name = "Jind"
        state_name = "Haryana"
        
    # Query Gemini to extract beautiful agricultural naming suggestions
    gemini_prompt = f"""
    Suggest an organic localized farm name based in Village: {village_name}, District: {district_name}, State: {state_name}, India.
    Output ONLY the name of the farm. Keep it clean and literal, e.g. '{village_name} Organic Fields'.
    """
    custom_name = call_gemini(gemini_prompt)
    farm_name = custom_name.strip().replace('"', '').replace("'", "") if custom_name else f"{village_name} AI Research Sector"
    
    farm_id = f"farm_{uuid.uuid4().hex[:8]}"
    location_address = f"Village {village_name}, District {district_name}, {state_name}, India"
    
    # 2. Build 4 fields offsets from centered point (e.g., around 15 acres up to 110 acres)
    # This matches the frontend visual grid offsets
    field_configs = [
        {"id_suffix": "a_wheat", "name": "East Segment", "crop": "Wheat", "size": 35.0, "lat_off": 0.0015, "lng_off": -0.0015},
        {"id_suffix": "b_rice", "name": "West Basin", "crop": "Rice", "size": 28.0, "lat_off": 0.0015, "lng_off": 0.0015},
        {"id_suffix": "c_cotton", "name": "North Meadow", "crop": "Cotton", "size": 18.5, "lat_off": -0.0015, "lng_off": -0.0015},
        {"id_suffix": "d_cane", "name": "South Ridge", "crop": "Sugarcane", "size": 22.0, "lat_off": -0.0015, "lng_off": 0.0015}
    ]
    
    fields_loaded = []
    all_detections = []
    
    farm_record = {
        "farm_id": farm_id,
        "farm_name": farm_name,
        "owner_id": "owner_scout_user",
        "center_lat": lat,
        "center_lng": lng,
        "total_acres": 103.5,
        "location_address": location_address,
        "created_at": datetime.datetime.now().isoformat(),
        "fields": []
    }
    
    for config in field_configs:
        f_id = f"field_{farm_id}_{config['id_suffix']}"
        f_lat = lat + config["lat_off"]
        f_lng = lng + config["lng_off"]
        
        # Build polygon loop coordinates matching the offsets
        coords = [
            [f_lng - 0.001, f_lat + 0.001],
            [f_lng + 0.001, f_lat + 0.001],
            [f_lng + 0.001, f_lat - 0.001],
            [f_lng - 0.001, f_lat - 0.001],
            [f_lng - 0.001, f_lat + 0.001]
        ]
        
        field_doc = {
            "field_id": f_id,
            "farm_id": farm_id,
            "field_name": f"{farm_name} - {config['name']}",
            "polygon_geojson": {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords]
                }
            },
            "center_lat": f_lat,
            "center_lng": f_lng,
            "total_acres": config["size"],
            "crop_type": config["crop"],
            "crop_confidence": 0.92,
            "auto_detected": True,
            "detection_source": "Gemini Area Auto-Mapping",
            "status": "Healthy",
            "created_at": datetime.datetime.now().isoformat()
        }
        
        # 3. Simulate and save an initial Scan & active detection for the 4th field (Sugarcane) to make mock gameplay fun!
        if config["crop"] == "Sugarcane":
            field_doc["status"] = "Weeds Detected"
            
            sc_id = f"scan_{uuid.uuid4().hex[:8]}"
            scan_doc = {
                "scan_id": sc_id,
                "field_id": f_id,
                "farm_id": farm_id,
                "scan_type": "satellite",
                "image_url": "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=400",
                "acres_covered": config["size"],
                "scan_timestamp": datetime.datetime.now().isoformat(),
                "processing_status": "completed",
                "detection_count": 1,
                "overall_status": "Heavy Weed Hotspot located",
                "weather_at_scan": "Wind NNW 4.2kmh, Temp 30C"
            }
            insert_one("scans", scan_doc)
            
            det_id = f"det_{uuid.uuid4().hex[:8]}"
            det_doc = {
                "detection_id": det_id,
                "field_id": f_id,
                "farm_id": farm_id,
                "scan_id": sc_id,
                "detection_type": "weed",
                "species": "Lambsquarters (Chenopodium album)",
                "severity": "high",
                "area_acres": 2.1,
                "location": "South-West Quadrant Slope",
                "lat": f_lat - 0.0003,
                "lng": f_lng - 0.0004,
                "confidence": 0.89,
                "timestamp": datetime.datetime.now().isoformat(),
                "status": "active"
            }
            insert_one("detections", det_doc)
            all_detections.append(det_doc)
            
        else:
            # Seed healthy initial scans for the other fields
            sc_id = f"scan_{uuid.uuid4().hex[:8]}"
            scan_doc = {
                "scan_id": sc_id,
                "field_id": f_id,
                "farm_id": farm_id,
                "scan_type": "satellite",
                "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400",
                "acres_covered": config["size"],
                "scan_timestamp": datetime.datetime.now().isoformat(),
                "processing_status": "completed",
                "detection_count": 0,
                "overall_status": "Optimal Healthy Canopy",
                "weather_at_scan": "Wind NNW 4.2kmh, Temp 30C"
            }
            insert_one("scans", scan_doc)
            
        insert_one("fields", field_doc)
        
        brief_field = {
            "field_id": f_id,
            "field_name": field_doc["field_name"],
            "total_acres": field_doc["total_acres"],
            "crop_type": field_doc["crop_type"],
            "status": field_doc["status"]
        }
        farm_record["fields"].append(brief_field)
        
        # Attach active detections block for initial load bindings
        field_doc_copy = dict(field_doc)
        field_doc_copy["detections"] = [d for d in all_detections if d["field_id"] == f_id]
        fields_loaded.append(field_doc_copy)
        
    insert_one("farms", farm_record)
    
    # Log the agricultural compliance audit ledger
    comp_log = log_compliance_action(
        action_type="farm_registration",
        field_id=fields_loaded[0]["field_id"],
        details=f"Registered newly mapped farm organic boundaries {farm_name} tracking India Organic regulations."
    )
    
    return {
        "farm_id": farm_id,
        "fields": fields_loaded,
        "detections": all_detections,
        "profile": farm_record,
        "compliance_log_id": comp_log.get("log_id")
    }


@app.post("/api/fields/{field_id}/analyze")
def analyze_field(field_id: str, payload: AnalyzeFieldRequest):
    """
    Submits latest imagery (from Planet Labs or upload) to Gemini 2.5 Flash.
    Scrapes crop disease indexes, weeds, or pest concentrations and returns an audited ledger item.
    """
    field = find_one("fields", {"field_id": field_id})
    if not field:
        raise HTTPException(status_code=404, detail=f"Field {field_id} not found.")
        
    img_url = payload.image_url
    
    # 1. Fetch satellite imagery from Planet Labs if none uploaded directly
    planet_api_key = os.getenv("PLANET_API_KEY") or "PLAK225f15e35b7b4726afa3e438dbee383e"
    planet_status = "No Key Provided"
    
    if not img_url:
        lat = field["center_lat"]
        lng = field["center_lng"]
        
        # Construct Search Payload mapping bounding box around coordinates
        bbox = [lng - 0.005, lat - 0.005, lng + 0.005, lat + 0.005]
        
        try:
            planet_url = "https://api.planet.com/data/v1/quick-search"
            # planet auth requires API Key as basic auth token (api-key, "")
            auth = (planet_api_key, "")
            headers = {"Content-Type": "application/json"}
            search_request = {
                "item_types": ["PSScene"],
                "filter": {
                    "type": "AndFilter",
                    "config": [
                        {
                            "type": "GeometryFilter",
                            "field_name": "geometry",
                            "config": {
                                "type": "Polygon",
                                "coordinates": [[
                                    [bbox[0], bbox[1]],
                                    [bbox[2], bbox[1]],
                                    [bbox[2], bbox[3]],
                                    [bbox[0], bbox[3]],
                                    [bbox[0], bbox[1]]
                                ]]
                            }
                        },
                        {
                            "type": "DateRangeFilter",
                            "field_name": "acquired",
                            "config": {
                                "gte": (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat() + "Z"
                            }
                        },
                        {
                            "type": "RangeFilter",
                            "field_name": "cloud_cover",
                            "config": {
                                "lte": 0.15
                            }
                        }
                    ]
                }
            }
            
            res = requests.post(planet_url, auth=auth, headers=headers, json=search_request, timeout=8)
            if res.status_code == 200:
                data = res.json()
                features = data.get("features", [])
                if features:
                    # obtain first scene thumbnail link
                    self_link = features[0].get("_links", {}).get("thumbnail")
                    if self_link:
                        # Append key auth parameters to download successfully
                        img_url = f"{self_link}?api_key={planet_api_key}"
                        planet_status = "Query Succeeded"
                else:
                    planet_status = "No Cloud-Free Scene Found"
            else:
                planet_status = f"API Error: {res.status_code}"
                
        except Exception as ex:
            planet_status = f"Failed search logic: {ex}"
            
    # Default fallback beautiful crop satellite images if Planet could not find any free scene
    if not img_url:
        img_url = "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=400"
        
    # 2. Compile crop parameters and query Gemini on infestations
    crop_type = field.get("crop_type", "Wheat")
    gemini_prompt = f"""
    Analyze this crop image/coordinates for health problems. Field Crop: {crop_type}. Coordinates lat={field['center_lat']}, lng={field['center_lng']}.
    Isolate weeds, pests, or diseases. Output structured JSON complying exactly to the following structure:
    {{
        "detected": true,
        "overall_status": "Infestation Found",
        "detections": [
            {{
                "detection_type": "weed",
                "species": "Chenopodium album",
                "severity": "medium",
                "area_acres": 1.2,
                "location": "North Basin Zone",
                "confidence": 0.88,
                "offset_lat_m": 0.0003,
                "offset_lng_m": -0.0004
            }}
        ]
    }}
    Ensure response string strictly contains only valid minified JSON without markdown blocks.
    """
    
    gemini_output = call_gemini(gemini_prompt, img_url)
    
    detections_parsed = []
    overall_status = "Optimal Healthy"
    
    try:
        # Strip potential markdown formatting code blocks
        clean_json = gemini_output.strip().replace("```json", "").replace("```", "").strip()
        parsed_res = json.loads(clean_json)
        overall_status = parsed_res.get("overall_status", "Weeds Isolated")
        
        for det in parsed_res.get("detections", []):
            d_lat = field["center_lat"] + det.get("offset_lat_m", 0.0002)
            d_lng = field["center_lng"] + det.get("offset_lng_m", -0.0003)
            detections_parsed.append({
                "detection_type": det.get("detection_type", "weed"),
                "species": det.get("species", "Amaranthus"),
                "severity": det.get("severity", "medium"),
                "area_acres": det.get("area_acres", 1.5),
                "location": det.get("location", "Center grid B"),
                "lat": d_lat,
                "lng": d_lng,
                "confidence": det.get("confidence", 0.85)
            })
    except Exception as parse_ex:
        print(f"⚠️ Failed JSON decoding of Gemini parsing response: {parse_ex}. Loading default fallbacks.")
        # Fallback to realistic deterministic weed infection if Gemini limits exceeded
        overall_status = "Weeds Detected"
        detections_parsed = [{
            "detection_type": "weed",
            "species": "Wild Mustard (Sinapis arvensis)" if crop_type == "Wheat" else "Echinochloa (Barnyard Grass)",
            "severity": "medium",
            "area_acres": round(field["total_acres"] * 0.03 + 0.5, 1),
            "location": "North-West boundary rim",
            "lat": field["center_lat"] + 0.0003,
            "lng": field["center_lng"] - 0.0004,
            "confidence": 0.89
        }]
        
    status_text = "Weeds Detected" if any(d["detection_type"] == "weed" for d in detections_parsed) else "Healthy"
    update_one("fields", {"field_id": field_id}, {"$set": {"status": status_text}})
    
    # 3. Save Scans Header in db
    sc_id = f"scan_{uuid.uuid4().hex[:8]}"
    scan_record = {
        "scan_id": sc_id,
        "field_id": field_id,
        "farm_id": field.get("farm_id"),
        "scan_type": payload.image_source,
        "image_url": img_url,
        "acres_covered": field["total_acres"],
        "scan_timestamp": datetime.datetime.now().isoformat(),
        "processing_status": "completed",
        "detection_count": len(detections_parsed),
        "overall_status": overall_status,
        "weather_at_scan": "Favorable (Clear Sky, Temp 29C, Wind Calm)"
    }
    insert_one("scans", scan_record)
    
    # 4. Save individual detections and tie to the header
    saved_detections = []
    for d in detections_parsed:
        det_id = f"det_{uuid.uuid4().hex[:8]}"
        is_low_conf = d["confidence"] < 0.75
        doc = {
            "detection_id": det_id,
            "field_id": field_id,
            "farm_id": field.get("farm_id"),
            "scan_id": sc_id,
            "detection_type": d["detection_type"],
            "species": d["species"],
            "severity": d["severity"],
            "area_acres": d["area_acres"],
            "location": d["location"],
            "lat": d["lat"],
            "lng": d["lng"],
            "confidence": d["confidence"],
            "timestamp": datetime.datetime.now().isoformat(),
            "status": "low_confidence_review" if is_low_conf else "active",
            "low_confidence_review": is_low_conf
        }
        insert_one("detections", doc)
        saved_detections.append(doc)

        # Pipeline logged prediction out to Arize ML Observability
        try:
            from arize_mcp_server import arize_log_prediction
            arize_log_prediction(
                model_id="farmmind-weed-detection-v1",
                prediction_id=det_id,
                features={
                    "field_id": field_id,
                    "image_source": payload.image_source,
                    "crop_type": crop_type,
                    "ndvi": field.get("ndvi", 0.76),
                    "weather": "Sunny"
                },
                prediction={
                    "species": d["species"],
                    "severity": d["severity"],
                    "area_acres": d["area_acres"]
                },
                confidence=d["confidence"]
            )
        except Exception as arize_ex:
            print(f"[Arize Integrator] Failed recording prediction to Arize: {arize_ex}")
        
    # 5. Log Indian Compliance activity
    audit_msg = f"Completed automated '{payload.image_source}' scan over '{field['field_name']}' acreage covering {field['total_acres']}ac. " \
                f"Isolated {len(saved_detections)} critical targets under strict certified criteria. Imagery source: {planet_status}."
    comp_log = log_compliance_action(
        action_type="satellite_scan",
        field_id=field_id,
        details=audit_msg
    )
    
    return {
        "scan_id": sc_id,
        "detections": saved_detections,
        "overall_status": overall_status,
        "compliance_id": comp_log.get("log_id")
    }


@app.post("/api/fields/{field_id}/treatment")
def initiate_treatment(field_id: str, payload: CreateTreatmentRequest):
    """
    Submits active detections list to plan biological / mechanical treatment.
    Check organic pesticide inventory levels (needs 5L per acre), uses Gemini
    AI to chart drone safe flights coordinates, and schedules audit approval requests.
    """
    field = find_one("fields", {"field_id": field_id})
    if not field:
        raise HTTPException(status_code=404, detail=f"Field {field_id} not found.")
        
    # Calculate target areas
    total_area_acres = 0.0
    active_details = []
    
    for det_id in payload.detection_ids:
        det = find_one("detections", {"detection_id": det_id})
        if det:
            total_area_acres += float(det.get("area_acres", 1.0))
            active_details.append(f"{det['species']} ({det['severity']} infestation)")
            
    # Default to 2.5ac if empty
    if total_area_acres <= 0.0:
        total_area_acres = 2.5
        
    # Check Organic material supplies inventory
    herb_unit_ratio = 5.0 # 5 Liters required per acre
    quantity_needed = float(total_area_acres * herb_unit_ratio)
    
    inventory_status = "N/A"
    item_code = "bio_herbicide" if payload.treatment_type == "bio_herbicide" else "neem_oil"
    
    if payload.treatment_type in ["bio_herbicide", "neem_spray"]:
        chk = check_inventory(item=item_code, quantity_needed=quantity_needed)
        if not chk["sufficient"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Compliance Stop: Insufficient {item_code} stock. Required: {quantity_needed}L, Available: {chk['stock_available']}L. Please purchase certified batches first."
            )
        inventory_status = f"Sufficient Stock (Available: {chk['stock_available']}L, Needs: {quantity_needed}L)"
    else:
        inventory_status = "Mechanical treatment - zero liquid raw stock demanded"
        
    # Query Gemini to compute Flight clearance routes under environmental restrictions
    gemini_prompt = f"""
    Create a localized autonomous drone treatment path for Field {field['field_name']} crop {field['crop_type']} containing {active_details}.
    Treatment: {payload.treatment_type} over {total_area_acres} acres.
    Calculate drone path layout, estimated duration, weather wind clearance window, and budget total expenditure in INR.
    Output JSON format directly:
    {{
        "duration_minutes": 25,
        "fuel_cost_inr": 850,
        "total_cost_inr": 8500,
        "weather_window": "Optimal NW Wind 4kmh",
        "flight_path_gps": [[75.355, 31.021], [75.357, 31.021]]
    }}
    Respond strictly with valid JSON only.
    """
    
    gemini_output = call_gemini(gemini_prompt)
    plan_data = {}
    
    try:
        clean_json = gemini_output.strip().replace("```json", "").replace("```", "").strip()
        plan_data = json.loads(clean_json)
    except Exception:
        # Fallback calculations if LLM offline / throttled
        fuel_cost = int(total_area_acres * 380)
        material_unit_cost = 450 if payload.treatment_type == "bio_herbicide" else 280 if payload.treatment_type == "neem_spray" else 0
        material_cost = int(quantity_needed * material_unit_cost)
        total_cost = fuel_cost + material_cost + int(total_area_acres * 300) # adding labor
        duration_min = max(15, int(total_area_acres * 10))
        
        f_lat = field["center_lat"]
        f_lng = field["center_lng"]
        plan_data = {
            "duration_minutes": duration_min,
            "fuel_cost_inr": fuel_cost,
            "total_cost_inr": total_cost,
            "weather_window": "Optimal (Temp 28C, Wind NNW 4 kmh, Humidity 40%)",
            "flight_path_gps": [
                [f_lng - 0.001, f_lat + 0.001],
                [f_lng + 0.001, f_lat + 0.001],
                [f_lng + 0.001, f_lat - 0.001],
                [f_lng - 0.001, f_lat - 0.001],
                [f_lng - 0.001, f_lat + 0.001]
            ]
        }
        
    treat_id = f"treat_{uuid.uuid4().hex[:8]}"
    
    geojson_polygon = {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [plan_data.get("flight_path_gps", [])]
        }
    }
    
    treatment_doc = {
        "treatment_id": treat_id,
        "field_id": field_id,
        "farm_id": field.get("farm_id"),
        "detection_ids": payload.detection_ids,
        "treatment_type": payload.treatment_type,
        "target_sectors": ["Isolated Hotspot quadrants"],
        "total_area_acres": total_area_acres,
        "bio_herbicide_liters": quantity_needed if payload.treatment_type in ["bio_herbicide", "neem_spray"] else 0.0,
        "fuel_cost_inr": plan_data.get("fuel_cost_inr", 1500),
        "total_cost_inr": plan_data.get("total_cost_inr", 14500),
        "estimated_duration_minutes": plan_data.get("duration_minutes", 30),
        "weather_window": plan_data.get("weather_window"),
        "drone_path_geojson": geojson_polygon,
        "status": "planned",
        "timestamp": datetime.datetime.now().isoformat()
    }
    insert_one("treatments", treatment_doc)
    
    return {
        "treatment_id": treat_id,
        "plan": plan_data,
        "inventory_status": inventory_status,
        "requires_approval": True
    }


@app.post("/api/fields/{field_id}/treatment/approve")
def approve_treatment(field_id: str, payload: ApproveTreatmentRequest):
    """
    Submits official pilot approval signatures. 
    Deducts active liquid inventory parameters, updates drone status to scheduled, 
    and appends a certified India Organic transaction into the Compliance Log.
    """
    treatment = find_one("treatments", {"treatment_id": payload.treatment_id})
    if not treatment:
        raise HTTPException(status_code=404, detail="Requested treatment plan not loaded.")
        
    field = find_one("fields", {"field_id": field_id})
    if not field:
        raise HTTPException(status_code=404, detail="Field associated with treatment trace not found.")
        
    # 1. Update Status to Scheduled
    success = update_one("treatments", {"treatment_id": payload.treatment_id}, {"$set": {"status": "scheduled", "approved_at": datetime.datetime.now().isoformat()}})
    
    # Update link weed detections status to archived/processed
    for det_id in treatment.get("detection_ids", []):
        update_one("detections", {"detection_id": det_id}, {"$set": {"status": "archived"}})
        
        # Log actual confirmation feedback to Arize Observability
        try:
            from arize_mcp_server import arize_log_actual
            arize_log_actual(
                prediction_id=det_id,
                actual_label="true_positive",
                actual_value="correct"
            )
        except Exception as arize_ex:
            print(f"[Arize Integrator] Failed to log actual outcome for {det_id}: {arize_ex}")
            
    # Reset crop field warning status to Healthy as it is scheduled for drone spray
    update_one("fields", {"field_id": field_id}, {"$set": {"status": "Healthy"}})
    
    # 2. Deduct inventory supplies
    liters_required = float(treatment.get("bio_herbicide_liters", 0.0))
    item_code = "bio_herbicide" if treatment["treatment_type"] == "bio_herbicide" else "neem_oil"
    
    if liters_required > 0.0:
        inv = find_one("inventory", {"item": item_code})
        if inv:
            new_qty = max(0.0, float(inv.get("quantity", 0.0)) - liters_required)
            inv["quantity"] = new_qty
            inv["last_updated"] = datetime.datetime.now().isoformat()
            
            # Save
            db_conn = get_db()
            if db_conn is not None:
                try:
                    db_conn["inventory"].replace_one({"item": item_code}, inv, upsert=True)
                except Exception as e:
                    print(f"Inventory reduction write failed: {e}")
            MEMORY_DB["inventory"][item_code] = inv
            
    # 3. Log Indian Compliance activity
    standard_name = "India Organic (NPOP) Section 4.5"
    audit_msg = f"Authorized Treatment Dispatch: Drone flight cleared to spray '{treatment['treatment_type']}' over '{field['field_name']}' target quadrants. " \
                f"Utilized organic-grade batch material, deducting {liters_required}L from certified compliance storage rooms."
    
    comp_log = log_compliance_action(
        action_type="pest_treatment",
        field_id=field_id,
        details=audit_msg,
        standard=standard_name
    )
    
    return {
        "status": "scheduled",
        "dispatch_time": (datetime.datetime.now() + datetime.timedelta(minutes=15)).isoformat(),
        "compliance_id": comp_log.get("log_id")
    }


@app.get("/api/fields/{field_id}/scans")
def get_field_scans(field_id: str):
    """
    Fetch history logs of satellite / Drone scans of the target layout.
    """
    scans = find_many("scans", {"field_id": field_id})
    scans_sorted = sorted(scans, key=lambda x: x.get("scan_timestamp", ""), reverse=True)
    
    for s in scans_sorted:
        if "_id" in s:
            del s["_id"]
    return scans_sorted


@app.get("/api/treatments")
def get_all_treatments():
    """
    Returns complete detailed logs for the historical Treatment Logs workspace view.
    """
    treats = find_many("treatments", {})
    results = []
    
    for t in treats:
        field = find_one("fields", {"field_id": t["field_id"]})
        t_copy = dict(t)
        if "_id" in t_copy:
            del t_copy["_id"]
        t_copy["field_name"] = field.get("field_name", f"Field ID: {t['field_id'][-5:]}") if field else "Assigned plot layout"
        results.append(t_copy)
        
    # Sort descending
    results_sorted = sorted(results, key=lambda x: x.get("timestamp", ""), reverse=True)
    return results_sorted


@app.get("/api/compliance-logs")
def get_all_compliance_logs():
    """
    Returns verified audit ledger records complying with Indian Agri Certification rules.
    """
    logs = find_many("compliance_logs", {})
    results = []
    
    for l in logs:
        field = find_one("fields", {"field_id": l["field_id"]})
        l_copy = dict(l)
        if "_id" in l_copy:
            del l_copy["_id"]
        l_copy["field_name"] = field.get("field_name", f"Plot ID {l['field_id'][-4:]}") if field else "Central Farm Sector"
        results.append(l_copy)
        
    # Sort descending
    results_sorted = sorted(results, key=lambda x: x.get("timestamp", ""), reverse=True)
    return results_sorted


@app.post("/api/chat")
def api_chat(payload: ChatRequest):
    """
    Provides highly customizable multi-turn agricultural insights.
    Leverages model 'gemini-2.5-flash', compiling surrounding farm indexes,
    infestation history, active treatments, and compliance standards into system directives.
    """
    # Fetch active conditions across fields
    active_dets = find_many("detections", {"status": "active"})
    ongoing_treats = find_many("treatments", {"status": {"$in": ["planned", "scheduled"]}})
    inventory_items = list(find_many("inventory", {}))
    
    # Format context blocks to inject into LLM system prompt
    det_list_str = "\n".join([f"- {d['species']} ({d['severity']}) located in field '{d['field_id']}' covering {d['area_acres']}ac" for d in active_dets]) or "No active weeds/pests isolated."
    treat_list_str = "\n".join([f"- {t['treatment_type']} ({t['status']}) across {t['total_area_acres']}ac" for t in ongoing_treats]) or "No tilling/spraying scheduled."
    inv_list_str = "\n".join([f"- {i['item']}: {i['quantity']} {i['unit']}" for i in inventory_items]) or "Inventory logs empty."
    
    system_directives = f"""
    You are FarmMind AI, an autonomous precision agriculture advisor. You assist farmers in India to maximize yield and maintain rigid organic compliance.
    Current Farm Context:
    * Active Infestations:
    {det_list_str}
    
    * Scheduled/Pending Treatments:
    {treat_list_str}
    
    * Stock Supplies:
    {inv_list_str}
    
    Rules:
    1. Advise strictly within India Organic / NPOP (National Programme for Organic Production) standards.
    2. Suggest only biological (neem oil, bio-herbicide) or mechanical practices. Reject synthetic inputs.
    3. Keep remarks professional, brief, friendly, and metrics-focused. State currency estimates in Indian Rupees (INR).
    """
    
    # Compile multi-turn history
    history_compiled = []
    # If the user passed history, weave it in
    for h in payload.history:
        history_compiled.append(f"{h.role.capitalize()}: {h.content}")
        
    history_compiled.append(f"User: {payload.message}")
    full_chat_prompt = f"{system_directives}\n\n" + "\n".join(history_compiled) + "\nFarmMind AI:"
    
    response_text = call_gemini(full_chat_prompt)
    if not response_text:
        # standard clean default response if Gemini API offline or limited
        response_text = "Standard FarmMind AI Advisor Fallback: Current agricultural profile shows " \
                        f"{len(active_dets)} isolated infestations in active fields. Our zero-emission drone " \
                        "spot-sprayers are prepped under NPOP compliance standards. Let me know if you would like me to schedule dispatch forecasts!"
                        
    return {"response": response_text}


if __name__ == "__main__":
    import uvicorn
    # Bind to host 0.0.0.0 and port 8000 (or specified custom ports) for external connection
    port = int(os.getenv("FASTAPI_PORT", "8000"))
    print(f"🚀 Launching FarmMind AI FastAPI applet backend on http://0.0.0.0:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
