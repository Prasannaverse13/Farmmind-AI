# 🌾 FarmMind AI — Precision Satellite Agriculture Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Platform](https://img.shields.io/badge/platform-React%20%7C%20FastAPI-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()
[![Database](https://img.shields.io/badge/database-MongoDB%20%26%20Firebase-emerald.svg)]()
[![Observability](https://img.shields.io/badge/Observability-Arize%2520AI-orange.svg)]()
[![Google Cloud](https://img.shields.io/badge/Google%2520Cloud-GCP%2520Services-blue.svg)]()

> A robust, satellite-powered agricultural intelligence platform delivering crop health diagnostics, yield forecasting, automated weed/pest classification, and precision UAV treatment flight pathing while ensuring full compliance with the Organic guidelines (e.g., National Programme for Organic Production - NPOP).

---

## 🌎 Project Overview

### 🪐 Core Vision
Modern agriculture faces the critical challenge of feeding a growing global population under extreme climate unpredictability. Smallholder and commercial farmers alike lack field-level, multi-spectral visibility into crop development, canopy moisture deficit, and dynamic weed or pathogen threats. **FarmMind AI** bridges this gap. 

By unifying high-frequency satellite remote sensing datasets, deep learning-based spatial segmentation, and generative agronomy advisors, our platform empowers users to transition from uniform crop management to pixel-level **Precision Farming**. 

```
                                  [ FarmMind AI Core Value Engine ]
  🛰️ Remote Sensing Ingestion ──> 🧪 Multi-Spectral Calibration ──> 🧠 U-Net Diagnostics ──> 🚜 Smart Interventions
```

- **The Problem Statement**: Crop diseases, pest invasions, and under-irrigation lead to billions in crop losses annually. Inefficient chemical spray cycles blanket healthy crops needlessly, contaminating local aquifers, degrading soil health, and violating organic farming certifications (like NPOP/India Organic guidelines).
- **The Solution**: An actionable, automated remote sensing pipeline that ingests commercial and open-source multispectral satellite imagery, computes vegetative/moisture indices (NDVI, NDWI, GNDVI, etc.), runs deep learning model inferences, partitions fields into k-means management zones, logs strict environmental compliance records, and coordinates targeted drone operations.

---

## 🛠️ Technology Stack & System Architecture

FarmMind AI employs a robust, modular full-stack architecture built to manage resource-intensive geospatial files and real-time AI tool pipelines safely.

### 💻 Client-Side Frontend
- **Framework**: React 18+ powered by **Vite** with strict TypeScript type safety.
- **Interactions**: Smooth spring and layout transitions designed via `motion/react` (Framer Motion).
- **Geospatial Mapping**: Advanced vector maps with custom overlays, polygon bounding box editors, and drawing controllers using the **Google Maps Platform** and **Mapbox GL JS** integrations.
- **Data Visualizations**: Responsive charts tracking multispectral indexes over time, model confidence bounds, and agronomic chemical inventories rendered through **Recharts** and **D3.js**.
- **Styles**: Elegant, responsive styling paired with custom display typography (Space Grotesk + JetBrains Mono) using **Tailwind CSS**.

### ⚙️ Server-Side Backend
- **Core API Engine**: Python 3.11+ **FastAPI** utilizing fast asynchronous event loops.
- **Caching & Brokers**: **Redis** serving as an in-memory application cache, temporal rate-limiter, and message broker.
- **Asynchronous Task Queue**: **Celery** managing heavy geospatial tasks (coordinate reprojections, image alignments, and PDF rendering exports).
- **Data Persistence**: Dual-layer architecture:
  - **Firebase Firestore** for rapid interactive sessions, document status updates, and client configurations.
  - **MongoDB Atlas** as the master spatial registry storing complex GeoJSON boundaries, historical NDVI sequences, and NPOP audit records.

### 🧠 Model Hub & AI/ML Pipelines
- **Generative Intelligence**: Google Gemini models (e.g., Gemini 2.5 Flash / Gemini 2.5 Pro) executing automated remote sensing translations, anomaly analyses, and agronomic chatbot responses.
- **Deep Learning Vision**: **TensorFlow** & **PyTorch** executing deep neural network segmentations (U-Net architectures) and temporal regressors (multi-variable XGBoost/LSTMs) for yield estimation and soil hydration analysis.
- **Observability**: **Arize AI** for continuous training logs, data drift triggers, and structural embedding monitors.
- **Agent Interoperability**: **Model Context Protocol (MCP)** hosting standard endpoints for bidirectional AI model and backend database operations.

---

## 🛰️ Imagery Processing & Analysis Workflow

FarmMind AI incorporates a complete, professional, one-shot satellite and aerial image processing workflow:

```
[IMAGE INGESTION] ──> [PREPROCESSING & CALIBRATION] ──> [AI/ML INFERENCE] ──> [POST-PROCESSING & ACTION]
```

### 1. Ingestion Layer
- **Unified Catalog**: Resolves multi-source datasets including ESA Sentinel-2 (10-meter spatial resolution across 13 bands), USGS/NASA Landsat-8/9 (30-meter resolution), and drone overlays (very high-resolution RGB + NIR).
- **Coordinate Reprojections**: Automatically parses EXIF/GeoTIFF spatial attributes, validates Coordinate Reference Systems (CRS), and reprojects data from UTM (e.g., EPSG:32643 for Northern India) to standard WGS84 native coordinates (EPSG:4326) with zero planar shift error.
- **Metadata Vault**: Automatically UUID-tags and writes raw imagery directly to Secure Cloud Storage (GCS) while publishing the catalog entry to the database.

### 2. Preprocessing & Calibration Pipeline
- **Ortho-Rectification & Alignment**: Pixel-wise coordinates stack across temporal dates.
- **Cloud/Shadow Masking**: Excludes occluded pixels from historical analyses using automated Scene Classification Layers (SCL) or Sentinel-2 QA bands.
- **Radiometric Correction**: Converts raw Digital Numbers (DN) to actual Top of Atmosphere (TOA) reflectance.
- **Atmospheric Corrections**: Applies *Sen2Cor* engines to correct for aerosol optical thickness and vapor attenuation.
- **Spectral Indices Computation**: Integrates mathematical operations across spectral bands:
  - **NDVI** (Normalized Difference Vegetation Index): `(NIR - Red) / (NIR + Red)` for biomass greenness.
  - **NDWI** (Normalized Difference Water Index): `(NIR - SWIR) / (NIR + SWIR)` for canopy water distress.
  - **GNDVI** (Green NDVI): `(NIR - Green) / (NIR + Green)` for relative leaf chlorophyll density.
  - **SAVI** (Soil Adjusted Vegetation Index): `[(1 + L) * (NIR - Red)] / (NIR + Red + L)` to suppress bare soil dust.
  - **NDRE** (Normalized Difference Red Edge): `(NIR - RedEdge) / (NIR + RedEdge)` for early vegetation stress detection.
  - **EVI** (Enhanced Vegetation Index): `2.5 * [(NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)]` to adapt to ultra-dense high-biomass canopies.

### 3. AI/ML Deep Analysis Layer
- **U-Net Segmentation**: Categorizes individual pixels into distinct classes: Healthy Canopy, Drought-Stressed, Diseased, Dead Crops, or Exposed Bed.
- **Soil Moisture Regression**: Extracts surface temperature patterns and NDWI bands via a Random Forest Regressor to compute localized soil moisture percentages.
- **Pathogen & Pest Risk**: Evaluates NDRE anomalies against real-time microclimate indicators (relative humidity/temperature) using an Isolation Forest anomaly classifier to pinpoint infestation vectors.
- **Yield Forecasting**: Aggregates multi-temporal spectral indicators, historical yield values, and growing degree-day (GDD) datasets using an XGBoost and Temporal Fusion Transformer stack to project yields (Tons/Hectare).

### 4. Post-Processing & Smart Exports
- **Management Zone Clustering**: Appoints k-means clustering on multi-band indexes to cluster continuous crop fields into distinct zone boundaries (e.g., High Quality, Moderate Density, Depressed/Underperforming).
- **Precision Action Tables**: Generates GPS coordinates of localized anomalies for target drone flybys, reducing herbicide application volume.
- **Industrial Output Downloads**: Packages print-ready PDF analytical reports, structured CSV datasets of zonal metrics, and ortho-rectified GeoTIFF overlays.

---

## 🗺️ Architectural Topology Diagram

The following Mermaid flow model displays the system interaction topologies across the platform layers:

```mermaid
graph TD
    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef server fill:#f0fdf4,stroke:#16a34a,stroke-width:2px;
    classDef mservice fill:#faf5ff,stroke:#7c3aed,stroke-width:2px;
    classDef data fill:#fffbeb,stroke:#d97706,stroke-width:2px;

    User([👤 Farm Operator]) ::: client
    Router["💻 React App & Map Interface <br>(Google Maps / Tailwind)"] ::: client
    Firebase_Auth["🔐 Firebase Auth"] ::: client

    subgraph Backend_Infrastructure [⚡ Python FastAPI Gateway / Express Server]
        API_Gateway["🔌 FastAPI API Router <br>(main.py / server.ts)"] ::: server
        Celery_Task["📦 Celery Background Workers"] ::: server
        Redis_Broker["💾 Redis Cache & Broker"] ::: server
    end

    subgraph Partner_Integrations_Layer [🔗 Core Integration Hub]
        MongoDB_Atlas[("🍃 MongoDB Atlas <br>(Spatial Registry)")] ::: data
        Firebase_FS[("🔥 Firebase Firestore <br>(App Sessions / Chats)")] ::: data
        Google_EE["🛰️ Google Earth Engine <br>(Satellite Catalogs / GCS)"] ::: mservice
        Gemini_Vertex["🧠 Google Gemini API <br>(Vertex AI Generation)"] ::: mservice
        Arize_Observability["👁️ Arize AI <br>(Model Drift Monitors)"] ::: mservice
        MCP_Server["🔌 FastMCP Agent Service <br>(mcp_server.py)"] ::: server
    end

    User --> Router
    Router --> Firebase_Auth
    Router --> API_Gateway
    
    API_Gateway --> Redis_Broker
    Redis_Broker --> Celery_Task
    
    API_Gateway --> Firebase_FS
    API_Gateway --> MongoDB_Atlas
    
    API_Gateway --> Google_EE
    API_Gateway --> Gemini_Vertex
    API_Gateway --> Arize_Observability
    API_Gateway --> MCP_Server

    Celery_Task --> Google_EE
```

---

## 📦 Partner Integrations & Code Implementations

FarmMind AI is built with real, robust partner APIs integrated directly into its core modules. Below are detailed execution specs and exact project code paths.

### 1. 🍃 MongoDB Atlas Integration
- **Purpose**: Acts as the system’s primary geospatial database core, cataloging complex field boundary polygons, historical spectral metrics, infestation alerts, and drone telemetry charts.
- **Aesthetic Core Integration**: Connected via an asynchronous `pymongo` motor client. Utilizes MongoDB's legacy geospatial `2dsphere` index to run high-speed query tasks (such as checking if a selected GPS coordinate falls inside or outside a defined field polygon).
- **Core Features**: 
  - Rapid geospatial field query operations.
  - Multi-spectral temporal indexing of records.
  - Robust local fallback in-memory engine to guarantee 100% platform uptime value during demo execution.
- **📂 Integration Code Location**:
  * `/backend/db/` & `/backend/models/` — MongoDB database schema declarations, geospatial indexes, models, and Python storage adapter classes.
  * `/main.py` — High-speed endpoints mapping to MongoDB, fallback operations, and demo dataset loaders.
  * `/server/db.ts` — Mock and persistent MongoDB collections for node-based configurations.

### 2. 👁️ Arize AI Integration
- **Purpose**: Full-lifecycle machine learning model observability. Guarantees crop classification precision, detects sensor telemetry drift, and monitors anomalous input tensors.
- **Aesthetic Core Integration**: Runs the official Arize python SDK directly inside image inference execution loops. When standard multi-spectral indices are logged, feature vectors and model predictions are sent to Arize Space boundaries to detect model drift.
- **Core Features**:
  - Live model tracking dashboards.
  - Data drift logging and automated alerts.
  - Detailed embedding checks for satellite vegetation signatures.
- **📂 Integration Code Location**:
  * `arize_mcp_server.py` — Customized Model Context Protocol server detailing model feature weights and logging parameters to the Arize cloud observer workspace.
  * `/backend/ml/observability/` & `/backend/ml/callbacks/` — Class decorators and callback modules designed to capture PyTorch inference layers and transport metrics to Arize APIs.

### 3. 🧠 Google Gemini Integration
- **Purpose**: Executes deep natural language processing for analytical reports, acts as an interactive precision agriculture advisor, and synthesizes satellite data into actionable recommendations.
- **Aesthetic Core Integration**: Integrated via the `@google/genai` TypeScript SDK on the server and Vertex AI library setups in Python. Employs advanced prompt structures to synthesize sensor indices (e.g., "The crop has an NDVI value of 0.72 with high active pest risks...") into structured human action checklists.
- **Core Features**:
  - Precision agronomist chatbot answers.
  - Automated translation of raw imagery metrics to high-fidelity field reports.
  - Actionable compliance summaries.
- **📂 Integration Code Location**:
  * `/backend/ai/gemini/` & `/backend/services/chat/` — System instructions, domain-specific agronomy rulesets, and streaming chat models.
  * `/main.py` & `/server.ts` — Live backend connections, model initializations, and REST API triggers.

### 4. 🔌 Model Context Protocol (MCP) Integration
- **Purpose**: Establishes standard data pipelines allowing LLM agents (like Google Gemini) to communicate directly with backend databases, local pesticide inventory monitors, and remote weather arrays.
- **Aesthetic Core Integration**: Hosts a `FastMCP` framework exposing key operational functions. This allows autonomous systems to call structural tools (e.g., retrieving actual boundaries or planning optimal paths) without complex API overrides.
- **Core Features**:
  - Standardized JSON tool specifications.
  - Multi-variable drone path generators and meteorological tools.
  - Audit trail integrations.
- **📂 Integration Code Location**:
  * `mcp_server.py` — Main implementation exporting the 7 core agricultural tools with custom arguments schemas.
  * `/backend/mcp/` & `/backend/tools/` — Direct configurations for standard agent tool parameters.

### 5. 🔥 Firebase & Firestore Integration
- **Purpose**: Manages secure client authentication and handles real-time synchronization of chat conversations, user sessions, and localized application setup configurations.
- **Aesthetic Core Integration**: Integrated via the web client SDK and authenticated backend rules. Enables seamless Google OAuth 2.0 login and matches users to their historical crop profiles.
- **Core Features**:
  - Multi-factor secure user session locks.
  - Live document sync for collaborative field operations.
  - Firebase security rules configured to protect private user records.
- **📂 Integration Code Location**:
  * `/src/lib/firebase.ts` — Dynamic client initialization and auth hooks.
  * `firestore.rules` — Strict cellular security constraints preventing unauthenticated database access.
  * `firebase-blueprint.json` & `firebase-applet-config.json` — Deployment maps for database indices and platform configurations.

---

## 🛠️ Google Products & Services Architecture

FarmMind AI leverages Google Cloud platform tools to power its heavy satellite data computing requirements:

* **Google Gemini**: Vertex AI endpoint generating natural-language agronomy guides.
* **Google Earth Engine**: Pulls multi-spectral Sentinel-2 datasets, masking clouds and aligning coordinate maps.
* **Google Cloud Run**: Hosts containerized FastAPI backends behind auto-scaling services.
* **Google Cloud Storage (GCS)**: Stores raw and processed multi-gigabyte satellite GeoTIFF files.
* **Google Vertex AI**: Trains and schedules forward inference runs for our crop health identification models.
* **Google BigQuery**: Stores time-series data of historical vegetation indices to model regional weather resilience.
* **Google Maps Platform**: Renders high-fidelity satellite base maps with client-side canvas boundaries.
* **Google OAuth 2.0**: Handles secure login flows.

---

## ⚡ Quick Start: Dev Environment Setup in 10 Minutes!

### 🔧 Prerequisites
- **Python** `3.11` or higher
- **Node.js** `18` or higher and **npm**
- **MongoDB Atlas** database cluster URI
- **Google Cloud** coordinates and Gemini API details

### Step 1: Clone & Configure Variables
Create a file named `.env` in the root directory:
```env
# 🎯 API Secrets & Platform Keys
GEMINI_API_KEY="your-gemini-sdk-api-key"
VITE_GOOGLE_MAPS_PLATFORM_KEY="your-google-maps-api-key"
MONGODB_URI="mongodb+srv://admin:secure_password@cluster0.atlas.mongodb.net/farmmind"
ARIZE_API_KEY="your-arize-observability-space-api-key"
ARIZE_SPACE_KEY="arize-space-reference"

# ⚙️ Operational Settings
FASTAPI_PORT="8000"
process.env.NODE_ENV="development"
```

### Step 2: Initialize & Run Backend Engine
Enter your project directory, set up your Python environment, and initialize dependencies:
```bash
# 1. Start Virtual Environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install Python Dependencies
pip install -r requirements.txt

# 3. Seed Mock Datasets (Populates MongoDB with green field coordinates, records, and drone metrics)
python3 -c "import main; main.seed_demo_records()"

# 4. Start the FastAPI local server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The FastAPI instance is live at `http://localhost:8000`. You can inspect the Swagger documentation via `http://localhost:8000/docs`.

### Step 3: Initialize & Run React Client
Run our high-speed React dashboard locally:
```bash
# 1. Install NPM packages
npm install

# 2. Boot Local Development Server
npm run dev
```
Open `http://localhost:3000` to interact with the FarmMind AI satellite mapping and precision agronomy interface.

### Step 4: Validate MCP Agent Tools Connection
Test that your agent tool models are functional:
```bash
npx @modelcontextprotocol/inspector python3 mcp_server.py
```

---

## 📡 API Endpoints Reference

### 1. Unified GIS Scans
- **`POST /api/fields/{field_id}/analyze`**
  - **Payload**: `{ crop: "wheat", growth_stage: " vegetative" }`
  - **Description**: Triggers a Landsat/Sentinel coordinate search, converts radiometric raster bands, runs deep segmentation models, and logs NPOP compliance entries.
  - **Response**: Status `200 OK` with JSON telemetry metadata.

- **`GET /api/fields/{field_id}/scans`**
  - **Description**: Compiles historical multi-spectral index changes (NDVI, NDWI) for a selected crop field.

### 2. Interactive Advisor chat
- **`POST /api/chat`**
  - **Payload**: `{ message: "My wheat has yellow spots, NDVI is down. What do I do?" }`
  - **Description**: Conversational advisor pipeline matching Google Gemini output against live inventory records to provide certified NPOP recommendations.

### 3. Spatial Inventory & DB Setup
- **`GET /api/fields`**
  - **Description**: Custom database query pulling mapped coordinates, current crop classifications, active infestations, and NDVI averages.

- **`POST /api/seed`**
  - **Description**: Utility route to clear active records and populate standard hackathon datasets instantly.

---

## 🔒 Security, Compliance & Observability

### 🌿 NPOP Organic Legal Ledgering
Under India's **National Programme for Organic Production (NPOP)** standards, every chemical intervention must be logged. FarmMind AI prevents unauthorized chemical actions:
1. **Tool Validations**: Drone spray path generators check if available chemical options are listed in certified directories.
2. **Immutable Audit Trails**: Successful spray treatments post a dynamic audit block to databases, preserving clean certified history.

### 🕵️ Model Drift Observability (Arize AI)
By feeding satellite imagery indexes to Arize models, operators can monitor feature performance over time:
- **Alert Flags**: Triggers warnings if cloud coverage trends shift or sensor calibrations drift beyond tolerances.
- **A/B Testing**: Tracks model precision updates securely.

---

## 🤝 Contributing Guidelines

We welcome pull requests to the FarmMind AI platform! To contribute:
1. **Branch Format**: `feature/your-detailed-improvement-profile`.
2. **Linting Verification**: Run `npm run lint` and verify Python imports are clean.
3. **Draft Pull Request**: Clear details highlighting your functional improvements.

---

## 📜 License
This project is licensed under the **MIT License** - see the `LICENSE` file for details.

---

## 📧 Contact & Technical Support
- **Project Lead**: Founder - `founder@yalixa.store`
- **Hackathon Workspace**: Google Cloud Rapid Agent Hackathon (MongoDB Partner Track)
- **Technical Inquiries**: `support@farmmind.ai`

---
*Developed with ❤️ to empower farmers with spatial satellite intelligence.*
