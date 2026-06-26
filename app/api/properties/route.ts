import { NextResponse } from 'next/server';
import { propertyRepository } from '@/lib/repository';

export async function GET() {
  const properties = propertyRepository.findAll();
  return NextResponse.json({ properties });
}
