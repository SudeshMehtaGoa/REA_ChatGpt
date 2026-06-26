import { prisma } from './prisma';
// eslint-disable-next-line @typescript-eslint/no-unused-vars

export interface Property {
  id: string;
  userType: string;
  intent: string;
  address: string;
  coordinates: { lat: number; lng: number };
  priceExpectation: number;
  buildYear: number;
  sizeSqm: number;
  rooms: number;
  baths: number;
  parking: number;
  createdAt: string;
}

export interface Preference {
  id: string;
  userType: string;
  intent: string;
  targetLocation: string;
  coordinates: { lat: number; lng: number };
  maxBudget: number;
  minSizeSqm: number;
  minRooms: number;
  searchRadiusKm: number;
  createdAt: string;
}

function toProperty(row: {
  id: string; userType: string; intent: string; address: string;
  lat: number; lng: number; priceExpectation: number; buildYear: number;
  sizeSqm: number; rooms: number; baths: number; parking: number; createdAt: Date;
}): Property {
  return {
    id: row.id,
    userType: row.userType,
    intent: row.intent,
    address: row.address,
    coordinates: { lat: row.lat, lng: row.lng },
    priceExpectation: row.priceExpectation,
    buildYear: row.buildYear,
    sizeSqm: row.sizeSqm,
    rooms: row.rooms,
    baths: row.baths,
    parking: row.parking,
    createdAt: row.createdAt.toISOString(),
  };
}

function toPreference(row: {
  id: string; userType: string; intent: string; targetLocation: string;
  lat: number; lng: number; maxBudget: number; minSizeSqm: number;
  minRooms: number; searchRadiusKm: number; createdAt: Date;
}): Preference {
  return {
    id: row.id,
    userType: row.userType,
    intent: row.intent,
    targetLocation: row.targetLocation,
    coordinates: { lat: row.lat, lng: row.lng },
    maxBudget: row.maxBudget,
    minSizeSqm: row.minSizeSqm,
    minRooms: row.minRooms,
    searchRadiusKm: row.searchRadiusKm,
    createdAt: row.createdAt.toISOString(),
  };
}

export const propertyRepository = {
  async saveProperty(p: Omit<Property, 'id' | 'createdAt'>): Promise<Property> {
    const row = await prisma.property.create({
      data: {
        userType: p.userType,
        intent: p.intent,
        address: p.address,
        lat: p.coordinates.lat,
        lng: p.coordinates.lng,
        priceExpectation: p.priceExpectation,
        buildYear: p.buildYear,
        sizeSqm: p.sizeSqm,
        rooms: p.rooms,
        baths: p.baths,
        parking: p.parking,
      },
    });
    return toProperty(row);
  },

  async findAll(): Promise<Property[]> {
    const rows = await prisma.property.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(toProperty);
  },

  async findByIntent(intent: string): Promise<Property[]> {
    const rows = await prisma.property.findMany({ where: { intent }, orderBy: { createdAt: 'desc' } });
    return rows.map(toProperty);
  },
};

export const preferenceRepository = {
  async savePreference(p: Omit<Preference, 'id' | 'createdAt'>): Promise<Preference> {
    const row = await prisma.preference.create({
      data: {
        userType: p.userType,
        intent: p.intent,
        targetLocation: p.targetLocation,
        lat: p.coordinates.lat,
        lng: p.coordinates.lng,
        maxBudget: p.maxBudget,
        minSizeSqm: p.minSizeSqm,
        minRooms: p.minRooms,
        searchRadiusKm: p.searchRadiusKm,
      },
    });
    return toPreference(row);
  },
};
