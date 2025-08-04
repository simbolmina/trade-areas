import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const MONGODB_URI = process.env.MONGODB_URI!;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const placeId = url.searchParams.get('placeId');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    let query: any = {};
    
    // Filter by place ID if provided
    if (placeId) {
      query.pid = placeId;
    }

    const homeZipcodes = await db.collection('home_zipcodes').find(query).toArray();
    
    return NextResponse.json(homeZipcodes);
  } catch (error) {
    console.error('Failed to fetch home zipcodes:', error);
    return NextResponse.json({ error: 'Failed to fetch home zipcodes' }, { status: 500 });
  } finally {
    await client.close();
  }
} 