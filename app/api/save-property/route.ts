import { NextRequest, NextResponse } from 'next/server';
import { propertyRepository } from '@/lib/repository';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const record = propertyRepository.saveProperty({
    userType: 'owner',
    intent: body.intent,
    address: body.address,
    coordinates: body.coordinates,
    priceExpectation: Number(body.priceExpectation),
    buildYear: Number(body.buildYear),
    sizeSqm: Number(body.sizeSqm),
    rooms: Number(body.rooms),
    baths: Number(body.baths),
    parking: Number(body.parking),
  });
  return NextResponse.json({ success: true, record });
}
