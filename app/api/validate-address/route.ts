import { NextRequest, NextResponse } from 'next/server';

function mockValidate(address: string) {
  // Deterministic-ish mock coords based on string hash so repeated calls return same value
  let hash = 0;
  for (let i = 0; i < address.length; i++) hash = (hash << 5) - hash + address.charCodeAt(i);
  const lat = 40.7128 + (hash % 1000) / 10000;
  const lng = -74.006 + ((hash >> 8) % 1000) / 10000;
  return { formatted_address: address, lat, lng };
}

export async function POST(req: NextRequest) {
  const { address } = await req.json();

  if (!address || !address.trim()) {
    return NextResponse.json({ valid: false, error: 'Empty address' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    const mock = mockValidate(address);
    return NextResponse.json({ valid: true, formatted_address: mock.formatted_address, lat: mock.lat, lng: mock.lng });
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();

  if (json.status === 'ZERO_RESULTS' || !json.results?.length) {
    return NextResponse.json({ valid: false, error: 'ZERO_RESULTS' }, { status: 200 });
  }

  if (json.status !== 'OK') {
    // API error — fall back to mock so prototype keeps working
    const mock = mockValidate(address);
    return NextResponse.json({ valid: true, formatted_address: mock.formatted_address, lat: mock.lat, lng: mock.lng });
  }

  const result = json.results[0];
  const { lat, lng } = result.geometry.location;
  return NextResponse.json({ valid: true, formatted_address: result.formatted_address, lat, lng });
}
