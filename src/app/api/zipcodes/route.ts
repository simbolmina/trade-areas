import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zipcodeIds = searchParams.get('zipcodeIds')?.split(',') || [];

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    let query: any = {};
    
    // Filter by zipcode IDs if provided
    if (zipcodeIds.length > 0) {
      query.id = { $in: zipcodeIds };
    }

    const zipcodes = await db.collection('zipcodes').find(query).toArray();
    
    return NextResponse.json(zipcodes);
  } catch (error) {
    console.error('Failed to fetch zipcodes:', error);
    return NextResponse.json({ error: 'Failed to fetch zipcodes' }, { status: 500 });
  } finally {
    await client.close();
  }
} 