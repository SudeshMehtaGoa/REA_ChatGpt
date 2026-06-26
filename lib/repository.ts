import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_FILE = path.join(process.cwd(), 'data.json');

export interface Property {
  id: string;
  userType: 'owner';
  intent: 'sell' | 'rent';
  address: string;
  coordinates: { lat: number; lng: number };
  /** Asking price (sell) or monthly rent (rent) in the currency the owner specified */
  priceExpectation: number;
  buildYear: number;         // e.g. 2018
  sizeSqm: number;           // always stored as square metres
  rooms: number;             // integer
  baths: number;             // integer
  parking: number;           // integer
  createdAt: string;
}

export interface Preference {
  id: string;
  userType: 'customer';
  intent: 'buy' | 'rent';
  targetLocation: string;
  coordinates: { lat: number; lng: number };
  maxBudget: number;         // max price (buy) or max monthly rent (rent)
  minSizeSqm: number;        // minimum size in square metres
  minRooms: number;          // integer
  searchRadiusKm: number;    // 1 | 2 | 5
  createdAt: string;
}

interface DataStore {
  properties: Property[];
  preferences: Preference[];
}

function readData(): DataStore {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data: DataStore): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export const propertyRepository = {
  saveProperty(payload: Omit<Property, 'id' | 'createdAt'>): Property {
    const data = readData();
    const record: Property = { id: uuidv4(), createdAt: new Date().toISOString(), ...payload };
    data.properties.push(record);
    writeData(data);
    return record;
  },

  findAll(): Property[] {
    return readData().properties;
  },

  findByIntent(intent: 'sell' | 'rent'): Property[] {
    return readData().properties.filter((p) => p.intent === intent);
  },
};

export const preferenceRepository = {
  savePreference(payload: Omit<Preference, 'id' | 'createdAt'>): Preference {
    const data = readData();
    const record: Preference = { id: uuidv4(), createdAt: new Date().toISOString(), ...payload };
    data.preferences.push(record);
    writeData(data);
    return record;
  },
};
