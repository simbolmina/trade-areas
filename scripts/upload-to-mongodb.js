const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// MongoDB connection string - you'll need to add this to .env.local
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(
    '❌ MONGODB_URI is not set. Please create a .env.local file with your MongoDB connection string.'
  );
  console.error(
    'Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trade-areas'
  );
  process.exit(1);
}

async function uploadToMongoDB() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    // Upload trade areas
    console.log('📤 Uploading trade_areas.json...');
    const tradeAreasPath = path.join(
      __dirname,
      '../public/data/trade_areas.json'
    );
    const tradeAreasData = JSON.parse(fs.readFileSync(tradeAreasPath, 'utf8'));

    // Parse stringified polygon data
    const parsedTradeAreas = tradeAreasData.map((item) => ({
      pid: item.pid,
      polygon:
        typeof item.polygon === 'string'
          ? JSON.parse(item.polygon)
          : item.polygon,
      trade_area: item.trade_area,
    }));

    // Clear existing data and insert new data
    await db.collection('trade_areas').deleteMany({});
    const tradeAreasResult = await db
      .collection('trade_areas')
      .insertMany(parsedTradeAreas);
    console.log(`✅ Uploaded ${tradeAreasResult.insertedCount} trade areas`);

    // Upload zipcodes
    console.log('📤 Uploading zipcodes.json...');
    const zipcodesPath = path.join(__dirname, '../public/data/zipcodes.json');
    const zipcodesData = JSON.parse(fs.readFileSync(zipcodesPath, 'utf8'));

    // Parse stringified polygon data
    const parsedZipcodes = zipcodesData.map((item) => ({
      id: item.id,
      polygon:
        typeof item.polygon === 'string'
          ? JSON.parse(item.polygon)
          : item.polygon,
    }));

    // Clear existing data and insert new data
    await db.collection('zipcodes').deleteMany({});
    const zipcodesResult = await db
      .collection('zipcodes')
      .insertMany(parsedZipcodes);
    console.log(`✅ Uploaded ${zipcodesResult.insertedCount} zipcodes`);

    // Upload home zipcodes
    console.log('📤 Uploading home_zipcodes.json...');
    const homeZipcodesPath = path.join(
      __dirname,
      '../public/data/home_zipcodes.json'
    );
    const homeZipcodesData = JSON.parse(
      fs.readFileSync(homeZipcodesPath, 'utf8')
    );

    // Clear existing data and insert new data
    await db.collection('home_zipcodes').deleteMany({});
    const homeZipcodesResult = await db
      .collection('home_zipcodes')
      .insertMany(homeZipcodesData);
    console.log(
      `✅ Uploaded ${homeZipcodesResult.insertedCount} home zipcodes records`
    );

    console.log('🎉 All data uploaded successfully!');

    // Create indexes for better performance
    console.log('🔍 Creating indexes...');
    await db.collection('trade_areas').createIndex({ pid: 1 });
    await db.collection('trade_areas').createIndex({ trade_area: 1 });
    await db.collection('zipcodes').createIndex({ id: 1 });
    await db.collection('home_zipcodes').createIndex({ pid: 1 });
    console.log('✅ Indexes created');
  } catch (error) {
    console.error('❌ Error uploading data:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the upload
uploadToMongoDB();
