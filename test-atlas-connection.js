const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Display the connection string (with password masked)
const connectionString = process.env.MONGO_URI.replace(/(mongodb\+srv:\/\/[^:]+:)([^@]+)(@.+)/, '$1*****$3');
console.log(`Attempting to connect to MongoDB Atlas with: ${connectionString}`);

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log('Database name:', mongoose.connection.db.databaseName);
    
    // List all collections in the database
    return mongoose.connection.db.listCollections().toArray();
  })
  .then(collections => {
    if (collections.length === 0) {
      console.log('No collections found in the database. This appears to be a new database.');
    } else {
      console.log(`Found ${collections.length} collections in the database:`);
      collections.forEach(collection => {
        console.log(` - ${collection.name}`);
      });
    }
    
    // Close the connection
    return mongoose.connection.close();
  })
  .then(() => {
    console.log('Connection closed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
