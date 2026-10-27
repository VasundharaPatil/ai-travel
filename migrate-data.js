const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connection URIs
const LOCAL_URI = 'mongodb://localhost:27017/travel-planner';
const ATLAS_URI = process.env.MONGO_URI;

// Track migration progress
let totalDocuments = 0;
let migratedDocuments = 0;

async function migrateData() {
  console.log('Starting data migration from local MongoDB to MongoDB Atlas...');
  
  let localClient = null;
  let atlasClient = null;
  
  try {
    // Connect to local MongoDB
    console.log('Connecting to local MongoDB...');
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    const localDb = localClient.db('travel-planner');
    console.log('✅ Connected to local MongoDB');
    
    // Connect to MongoDB Atlas
    console.log('Connecting to MongoDB Atlas...');
    atlasClient = new MongoClient(ATLAS_URI);
    await atlasClient.connect();
    const atlasDb = atlasClient.db('travel-planner');
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get all collections from local database
    console.log('Fetching collections from local database...');
    const collections = await localDb.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('No collections found in local database. Nothing to migrate.');
      return;
    }
    
    console.log(`Found ${collections.length} collections in local database.`);
    
    // Migrate each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      
      // Skip system collections
      if (collectionName.startsWith('system.')) {
        console.log(`Skipping system collection: ${collectionName}`);
        continue;
      }
      
      console.log(`\nMigrating collection: ${collectionName}`);
      
      // Get documents from local collection
      const localCollection = localDb.collection(collectionName);
      const documents = await localCollection.find({}).toArray();
      
      totalDocuments += documents.length;
      console.log(`Found ${documents.length} documents in ${collectionName}`);
      
      if (documents.length === 0) {
        console.log(`Collection ${collectionName} is empty, skipping.`);
        continue;
      }
      
      // Get Atlas collection
      const atlasCollection = atlasDb.collection(collectionName);
      
      // Insert documents into Atlas collection in batches to avoid timeout
      const batchSize = 100;
      let insertedCount = 0;
      
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        if (batch.length > 0) {
          try {
            const result = await atlasCollection.insertMany(batch, { ordered: false });
            insertedCount += batch.length;
            console.log(`Batch progress: ${insertedCount}/${documents.length} documents inserted to ${collectionName}`);
          } catch (insertError) {
            // Handle duplicate key errors (continue with migration)
            if (insertError.code === 11000) {
              console.log(`Some documents already exist in the collection. Continuing migration...`);
              insertedCount += batch.length - insertError.writeErrors.length;
            } else {
              throw insertError;
            }
          }
        }
      }
      
      migratedDocuments += insertedCount;
      console.log(`✅ Migrated ${insertedCount} documents to ${collectionName}`);
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total collections: ${collections.length}`);
    console.log(`Total documents: ${totalDocuments}`);
    console.log(`Migrated documents: ${migratedDocuments}`);
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    console.error('Error details:', error.stack);
    
    // Check if local MongoDB is running
    if (error.name === 'MongoNetworkError' && error.message.includes('connect ECONNREFUSED')) {
      console.error('\n⚠️ It appears your local MongoDB server is not running.');
      console.error('Please make sure MongoDB is installed and running on your local machine.');
      console.error('You can start MongoDB with the command: mongod');
    }
  } finally {
    // Close connections
    try {
      if (localClient) await localClient.close();
      if (atlasClient) await atlasClient.close();
      console.log('Connections closed.');
    } catch (err) {
      console.error('Error closing connections:', err);
    }
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('Migration script finished.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });
