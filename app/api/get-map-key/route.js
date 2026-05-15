import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '' });
}
