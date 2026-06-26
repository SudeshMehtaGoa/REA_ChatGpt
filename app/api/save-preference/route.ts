import { NextRequest, NextResponse } from 'next/server';
import { preferenceRepository, propertyRepository } from '@/lib/repository';
import { getHaversineDistance } from '@/lib/haversine';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const record = await preferenceRepository.savePreference({
    userType: 'customer',
    intent: body.intent,
    targetLocation: body.targetLocation,
    coordinates: body.coordinates,
    maxBudget: Number(body.maxBudget),
    minSizeSqm: Number(body.minSizeSqm),
    minRooms: Number(body.minRooms),
    searchRadiusKm: Number(body.searchRadiusKm),
  });

  // "buy" matches "sell" listings, "rent" matches "rent" listings
  const ownerIntent = body.intent === 'buy' ? 'sell' : 'rent';
  const listings = await propertyRepository.findByIntent(ownerIntent);

  const matches = listings.filter((p) => {
    const dist = getHaversineDistance(
      body.coordinates.lat, body.coordinates.lng,
      p.coordinates.lat, p.coordinates.lng
    );
    return dist <= body.searchRadiusKm;
  });

  return NextResponse.json({ success: true, record, matches });
}
