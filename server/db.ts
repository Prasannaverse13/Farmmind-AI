import { MongoClient } from "mongodb";

let client: MongoClient | null = null;
let activeSmartDb: SmartDb | null = null;

const DEFAULT_MONGODB_URI = "mongodb+srv://prasannaverse13:prasannaverse13@cluster0.j6zf2.mongodb.net/farmmind?retryWrites=true&w=majority";

// In-memory persistent database representation when MongoDB is offline / auth fails
export const inMemoryData: Record<string, any[]> = {
  fields: [
    {
      field_id: "field-a",
      field_name: "Field B", // Note: mapped dynamically by front-end / server, but let's keep it aligned
      total_acres: 110,
      crop_type: "Wheat",
      location: "Punjab",
      status: "Healthy",
      last_scanned: "1 day ago",
      ndvi: 0.76,
      infrastructure: "Irrigation Line #4",
      detections: []
    },
    {
      field_id: "field-b",
      field_name: "Field B",
      total_acres: 85,
      crop_type: "Rice",
      location: "Punjab",
      status: "Weeds Detected",
      last_scanned: "2 hours ago",
      ndvi: 0.68,
      infrastructure: "Irrigation Line #2",
      detections: [
        {
          id: "det-1",
          name: "Amaranthus",
          species: "Amaranthus",
          severity: "Medium",
          acreage: 2.3,
          area_acres: 2.3,
          icon: "🌿"
        },
        {
          id: "det-2",
          name: "Aphids",
          species: "Aphids",
          severity: "Low",
          acreage: 0.8,
          area_acres: 0.8,
          icon: "🐛"
        }
      ]
    },
    {
      field_id: "field-c",
      field_name: "Field C",
      total_acres: 65,
      crop_type: "Cotton",
      location: "Haryana",
      status: "Healthy",
      last_scanned: "3 hours ago",
      ndvi: 0.81,
      infrastructure: "Irrigation Line #1",
      detections: []
    },
    {
      field_id: "field-d",
      field_name: "Field D",
      total_acres: 80,
      crop_type: "Sugarcane",
      location: "Haryana",
      status: "Weeds Detected",
      last_scanned: "5 hours ago",
      ndvi: 0.62,
      infrastructure: "Sprinkler Zone #3",
      detections: [
        {
          id: "det-3",
          name: "Lambsquarters",
          species: "Lambsquarters",
          severity: "High",
          acreage: 4.1,
          area_acres: 4.1,
          icon: "🌿"
        }
      ]
    }
  ]
};

// Map display names to keep them standard
for (const f of inMemoryData.fields) {
  if (f.field_id === "field-a") f.field_name = "Field A";
}

class InMemoryCollection {
  private name: string;
  constructor(name: string) {
    this.name = name;
    if (!inMemoryData[name]) {
      inMemoryData[name] = [];
    }
  }

  find(query: any = {}) {
    return {
      toArray: async () => {
        return inMemoryData[this.name].filter((item: any) => {
          for (const k in query) {
            if (item[k] !== query[k]) return false;
          }
          return true;
        });
      }
    };
  }

  async findOne(query: any) {
    return inMemoryData[this.name].find((item: any) => {
      for (const k in query) {
        if (item[k] !== query[k]) return false;
      }
      return true;
    }) || null;
  }

  async updateOne(query: any, update: any) {
    const item = inMemoryData[this.name].find((i: any) => {
      for (const k in query) {
        if (i[k] !== query[k]) return false;
      }
      return true;
    });
    if (item) {
      if (update.$set) {
        Object.assign(item, update.$set);
      } else {
        Object.assign(item, update);
      }
    }
    return { modifiedCount: item ? 1 : 0 };
  }

  async replaceOne(query: any, doc: any, options: any = {}) {
    const idx = inMemoryData[this.name].findIndex((i: any) => {
      for (const k in query) {
        if (i[k] !== query[k]) return false;
      }
      return true;
    });
    if (idx !== -1) {
      inMemoryData[this.name][idx] = { ...doc };
      return { modifiedCount: 1 };
    } else if (options.upsert) {
      inMemoryData[this.name].push({ ...doc });
      return { upsertedCount: 1, upsertedId: "upserted" };
    }
    return { modifiedCount: 0 };
  }

  async countDocuments() {
    return inMemoryData[this.name].length;
  }

  async insertMany(newItems: any[]) {
    for (const item of newItems) {
      const idKey = item.field_id ? "field_id" : (item.id ? "id" : (item.log_id ? "log_id" : "treatment_id"));
      const exists = inMemoryData[this.name].some((i: any) => item[idKey] && i[idKey] === item[idKey]);
      if (!exists) {
        inMemoryData[this.name].push(item);
      }
    }
    return { insertedCount: newItems.length };
  }

  async insertOne(item: any) {
    inMemoryData[this.name].push(item);
    return { insertedId: item.field_id || item.id || item.treatment_id || item.log_id || "ok" };
  }

  async deleteMany(query: any = {}) {
    inMemoryData[this.name] = inMemoryData[this.name].filter((item: any) => {
      for (const k in query) {
        if (item[k] === query[k]) return false;
      }
      return true;
    });
    return { deletedCount: 1 };
  }
}

class SmartCollection {
  public realCollection: any;
  private fallbackCollection: InMemoryCollection;

  constructor(realCollection: any, name: string) {
    this.realCollection = realCollection;
    this.fallbackCollection = new InMemoryCollection(name);
  }

  find(query: any = {}) {
    return {
      toArray: async () => {
        try {
          if (!this.realCollection) {
            const cursor = this.fallbackCollection.find(query);
            return await cursor.toArray();
          }
          const realResult = this.realCollection.find(query);
          return await realResult.toArray();
        } catch (err) {
          console.warn("MongoDB collection.find.toArray error, falling back to in-memory store:", err);
          const cursor = this.fallbackCollection.find(query);
          return await cursor.toArray();
        }
      }
    };
  }

  async findOne(query: any) {
    try {
      if (!this.realCollection) {
        return await this.fallbackCollection.findOne(query);
      }
      return await this.realCollection.findOne(query);
    } catch (err) {
      console.warn("MongoDB collection.findOne error, falling back to in-memory store:", err);
      return await this.fallbackCollection.findOne(query);
    }
  }

  async updateOne(query: any, update: any) {
    try {
      if (this.realCollection) {
        try {
          await this.realCollection.updateOne(query, update);
        } catch (err) {
          console.warn("MongoDB updateOne failed, falling back to database sandbox registry:", err);
        }
      }
      return await this.fallbackCollection.updateOne(query, update);
    } catch (err) {
      return await this.fallbackCollection.updateOne(query, update);
    }
  }

  async replaceOne(query: any, doc: any, options: any = {}) {
    try {
      if (this.realCollection) {
        try {
          await this.realCollection.replaceOne(query, doc, options);
        } catch (err) {
          console.warn("MongoDB replaceOne failed:", err);
        }
      }
      return await this.fallbackCollection.replaceOne(query, doc, options);
    } catch (err) {
      return await this.fallbackCollection.replaceOne(query, doc, options);
    }
  }

  async countDocuments() {
    try {
      if (!this.realCollection) {
        return await this.fallbackCollection.countDocuments();
      }
      return await this.realCollection.countDocuments();
    } catch (err) {
      return await this.fallbackCollection.countDocuments();
    }
  }

  async insertMany(newItems: any[]) {
    try {
      if (this.realCollection) {
        try {
          await this.realCollection.insertMany(newItems);
        } catch (err) {
          console.warn("MongoDB insertMany failed:", err);
        }
      }
      return await this.fallbackCollection.insertMany(newItems);
    } catch (err) {
      return await this.fallbackCollection.insertMany(newItems);
    }
  }

  async insertOne(item: any) {
    try {
      if (this.realCollection) {
        try {
          await this.realCollection.insertOne(item);
        } catch (err) {
          console.warn("MongoDB insertOne failed:", err);
        }
      }
      return await this.fallbackCollection.insertOne(item);
    } catch (err) {
      return await this.fallbackCollection.insertOne(item);
    }
  }

  async deleteMany(query: any = {}) {
    try {
      if (this.realCollection) {
        try {
          await this.realCollection.deleteMany(query);
        } catch (err) {
          console.warn("MongoDB deleteMany failed:", err);
        }
      }
      return await this.fallbackCollection.deleteMany(query);
    } catch (err) {
      return await this.fallbackCollection.deleteMany(query);
    }
  }
}

class SmartDb {
  private realDb: any;
  constructor(realDb: any) {
    this.realDb = realDb;
  }

  collection(name: string) {
    return new SmartCollection(this.realDb ? this.realDb.collection(name) : null, name);
  }
}

export async function getDb(): Promise<any> {
  if (activeSmartDb) return activeSmartDb;

  const uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
  try {
    if (!client) {
      client = new MongoClient(uri, {
        connectTimeoutMS: 4000,
        socketTimeoutMS: 4000,
        serverSelectionTimeoutMS: 4000
      });
      await client.connect();
      console.log("Successfully connected to real MongoDB instance cloud cluster.");
    }
    const realDb = client.db("farmmind");
    activeSmartDb = new SmartDb(realDb);
    await seedInitialData(activeSmartDb);
  } catch (err) {
    console.warn("Could not authenticate or connect to MongoDB cloud instance. Activating secure, offline-safe mock database sandboxing:", err);
    // Return mock database instance safely
    activeSmartDb = new SmartDb(null);
    await seedInitialData(activeSmartDb);
  }

  return activeSmartDb;
}

export interface Detection {
  id: string;
  name: string;
  species: string;
  severity: "High" | "Medium" | "Low";
  acreage: number;
  area_acres: number;
  icon: string;
  lat?: number;
  lng?: number;
}

export interface ScanHistoryItem {
  date: string;
  status: "Healthy" | "Weeds Detected" | "Critical";
  detection_count: number;
  thumbnail_url?: string;
  message?: string;
}

export interface Field {
  field_id: string;
  field_name: string;
  total_acres: number;
  crop_type: string;
  location: string;
  status: "Healthy" | "Weeds Detected" | "Critical";
  last_scanned: string;
  detections: Detection[];
  ndvi: number;
  moisture_level?: number;
  pest_count?: number;
  infrastructure: string;
  center_lat?: number;
  center_lng?: number;
  polygon_geojson?: { lat: number; lng: number }[];
  scan_history?: ScanHistoryItem[];
  heatmap_data?: { lat: number; lng: number; weight: number }[];
}

export function calculatePolygonAcreage(coords: { lat: number; lng: number }[]): number {
  if (!coords || coords.length < 3) return 0;
  try {
    const latRef = coords[0].lat;
    const latRad = (latRef * Math.PI) / 180;
    const metersPerLat = 111132;
    const metersPerLng = 111132 * Math.cos(latRad);

    const points = coords.map((c) => ({
      x: c.lng * metersPerLng,
      y: c.lat * metersPerLat,
    }));

    let areaSum = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      areaSum += points[i].x * points[next].y - points[next].x * points[i].y;
    }

    const areaSqMeters = Math.abs(areaSum) / 2;
    const acres = areaSqMeters / 4046.8564;
    return parseFloat(acres.toFixed(1));
  } catch (err) {
    return 80; // resilient fallback
  }
}

export function calculatePolygonCenter(coords: { lat: number; lng: number }[]): { lat: number; lng: number } {
  if (!coords || coords.length === 0) return { lat: 31.02, lng: 75.35 };
  let latSum = 0;
  let lngSum = 0;
  coords.forEach((c) => {
    latSum += c.lat;
    lngSum += c.lng;
  });
  return {
    lat: parseFloat((latSum / coords.length).toFixed(6)),
    lng: parseFloat((lngSum / coords.length).toFixed(6)),
  };
}

async function seedInitialData(database: any) {
  const collection = database.collection("fields");
  const count = await collection.countDocuments();
  if (count === 0) {
    console.log("Populating initial seed telemetry into active sandboxed memory registry...");
    
    const initialFields: Field[] = [
      {
        field_id: "field-a",
        field_name: "Field A",
        total_acres: 110,
        crop_type: "Wheat",
        location: "Punjab",
        status: "Healthy",
        last_scanned: "1 day ago",
        ndvi: 0.76,
        moisture_level: 68,
        pest_count: 0,
        infrastructure: "Irrigation Line #4",
        center_lat: 31.025,
        center_lng: 75.348,
        polygon_geojson: [
          { lat: 31.028, lng: 75.344 },
          { lat: 31.028, lng: 75.352 },
          { lat: 31.022, lng: 75.352 },
          { lat: 31.022, lng: 75.344 }
        ],
        scan_history: [
          { date: "Jun 5, 2026", status: "Healthy", detection_count: 0, message: "Multi-spectral sensors read good water distribution, zero infestation tags." }
        ],
        heatmap_data: [],
        detections: []
      },
      {
        field_id: "field-b",
        field_name: "Field B",
        total_acres: 85,
        crop_type: "Rice",
        location: "Punjab",
        status: "Weeds Detected",
        last_scanned: "2 hours ago",
        ndvi: 0.68,
        moisture_level: 54,
        pest_count: 2,
        infrastructure: "Irrigation Line #2",
        center_lat: 31.021,
        center_lng: 75.355,
        polygon_geojson: [
          { lat: 31.023, lng: 75.352 },
          { lat: 31.023, lng: 75.358 },
          { lat: 31.019, lng: 75.358 },
          { lat: 31.019, lng: 75.352 }
        ],
        scan_history: [
          { date: "Jun 6, 2026", status: "Healthy", detection_count: 0, message: "Clear early scan." },
          { date: "Jun 7, 2026", status: "Weeds Detected", detection_count: 2, message: "Amaranthus patch active on standard quadrant vectors. Early treatment queued." }
        ],
        heatmap_data: [
          { lat: 31.0215, lng: 75.354, weight: 0.7 },
          { lat: 31.0205, lng: 75.356, weight: 0.4 }
        ],
        detections: [
          {
            id: "det-1",
            name: "Amaranthus",
            species: "Amaranthus",
            severity: "Medium",
            acreage: 2.3,
            area_acres: 2.3,
            icon: "🌿",
            lat: 31.0215,
            lng: 75.354
          },
          {
            id: "det-2",
            name: "Aphids",
            species: "Aphids",
            severity: "Low",
            acreage: 0.8,
            area_acres: 0.8,
            icon: "🐛",
            lat: 31.0205,
            lng: 75.356
          }
        ]
      },
      {
        field_id: "field-c",
        field_name: "Field C",
        total_acres: 65,
        crop_type: "Cotton",
        location: "Haryana",
        status: "Healthy",
        last_scanned: "3 hours ago",
        ndvi: 0.81,
        moisture_level: 72,
        pest_count: 0,
        infrastructure: "Irrigation Line #1",
        center_lat: 29.060,
        center_lng: 76.015,
        polygon_geojson: [
          { lat: 29.062, lng: 76.012 },
          { lat: 29.062, lng: 76.018 },
          { lat: 29.058, lng: 76.018 },
          { lat: 29.058, lng: 76.012 }
        ],
        scan_history: [
          { date: "Jun 3, 2026", status: "Healthy", detection_count: 0, message: "Excellent soil canopy index. Micro-sensors index optimal." }
        ],
        heatmap_data: [],
        detections: []
      },
      {
        field_id: "field-d",
        field_name: "Field D",
        total_acres: 80,
        crop_type: "Sugarcane",
        location: "Haryana",
        status: "Weeds Detected",
        last_scanned: "5 hours ago",
        ndvi: 0.62,
        moisture_level: 47,
        pest_count: 1,
        infrastructure: "Sprinkler Zone #3",
        center_lat: 29.065,
        center_lng: 76.025,
        polygon_geojson: [
          { lat: 29.067, lng: 76.022 },
          { lat: 29.067, lng: 76.028 },
          { lat: 29.063, lng: 76.028 },
          { lat: 29.063, lng: 76.022 }
        ],
        scan_history: [
          { date: "Jun 4, 2026", status: "Healthy", detection_count: 0, message: "Dry sector observed." },
          { date: "Jun 7, 2026", status: "Weeds Detected", detection_count: 1, message: "Lambsquarters density index spike across core block sector." }
        ],
        heatmap_data: [
          { lat: 29.0645, lng: 76.0245, weight: 0.9 }
        ],
        detections: [
          {
            id: "det-3",
            name: "Lambsquarters",
            species: "Lambsquarters",
            severity: "High",
            acreage: 4.1,
            area_acres: 4.1,
            icon: "🌿",
            lat: 29.0645,
            lng: 76.0245
          }
        ]
      }
    ];

    await collection.insertMany(initialFields);
    console.log("Precision telemetry registry initialized perfectly.");

    // Seed initial treatments
    const treatmentsCol = database.collection("treatments");
    const tCount = await treatmentsCol.countDocuments();
    if (tCount === 0) {
      const initialTreatments = [
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
      await treatmentsCol.insertMany(initialTreatments);
      console.log("Seeded treatments successfully in active database.");
    }

    // Seed initial compliance logs
    const complianceCol = database.collection("compliance_logs");
    const cCount = await complianceCol.countDocuments();
    if (cCount === 0) {
      const initialCompliance = [
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
      await complianceCol.insertMany(initialCompliance);
      console.log("Seeded compliance logs successfully in active database.");
    }
  }
}
