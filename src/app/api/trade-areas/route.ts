import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const placeIds = searchParams.get('placeIds');
    const tradeAreaPercentages = searchParams.get('tradeAreaPercentages');

    if (!placeIds || !tradeAreaPercentages) {
      return NextResponse.json(
        {
          error:
            'Missing required parameters: placeIds and tradeAreaPercentages',
        },
        { status: 400 }
      );
    }

    const placeIdsArray = placeIds.split(',');
    const percentagesArray = tradeAreaPercentages
      .split(',')
      .map((p) => parseInt(p));

    const client = new MongoClient(MONGODB_URI!);
    await client.connect();

    const db = client.db();
    const collection = db.collection('trade_areas');

    const query = {
      pid: { $in: placeIdsArray },
      trade_area: { $in: percentagesArray },
    };

    const tradeAreas = await collection.find(query).toArray();

    await client.close();

    return NextResponse.json(tradeAreas);
  } catch (error) {
    console.error('Error fetching trade areas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade areas' },
      { status: 500 }
    );
  }
}
