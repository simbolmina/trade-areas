# MongoDB Upload Script

This script uploads your large JSON data files to MongoDB for better performance.

## Setup

1. **Install MongoDB dependency:**
   ```bash
   npm install mongodb
   ```

2. **Create `.env.local` file in the root directory:**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trade-areas?retryWrites=true&w=majority
   ```

3. **Run the upload script:**
   ```bash
   npm run upload-data
   ```

## What the script does:

- 📤 Uploads `trade_areas.json` (344MB) to `trade_areas` collection
- 📤 Uploads `zipcodes.json` (25MB) to `zipcodes` collection  
- 📤 Uploads `home_zipcodes.json` (3.3MB) to `home_zipcodes` collection
- 🔍 Creates indexes for better query performance
- 🔄 Parses stringified polygon data automatically

## MongoDB Collections:

- **trade_areas**: Contains trade area polygons with `pid`, `polygon`, `trade_area` fields
- **zipcodes**: Contains zipcode boundaries with `id`, `polygon` fields  
- **home_zipcodes**: Contains customer data with `pid`, `locations` fields

## Benefits:

✅ **No more 344MB file downloads**  
✅ **Faster queries with indexes**  
✅ **Better memory usage**  
✅ **Scalable solution**  
✅ **No CORS issues**  

## Next Steps:

After uploading, update your data loader to fetch from MongoDB instead of JSON files. 