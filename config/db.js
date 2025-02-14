// const mongoose = require('mongoose');

// const connectDB = async () => {
//   try {
//     await mongoose.connect('mongodb://localhost:27017/spotify-db', {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//       serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
//       socketTimeoutMS: 45000, // Increase socket timeout to 45 seconds
//     });
//     console.log('MongoDB connected successfully');
//   } catch (err) {
//     console.error(`MongoDB connection error: ${err.message}`);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;

require('dotenv').config();
const mongoose = require('mongoose');

const username = encodeURIComponent(process.env.MONGO_USERNAME);
const password = encodeURIComponent(process.env.MONGO_PASSWORD);
const cluster = process.env.MONGO_CLUSTER;
const dbName = process.env.MONGO_DBNAME;

const uri = `mongodb+srv://${username}:${password}@${cluster}.mongodb.net/${dbName}?retryWrites=true&w=majority`;

const connectDB = async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30s timeout
      socketTimeoutMS: 45000, // 45s socket timeout
    });

    console.log('✅ MongoDB Atlas connected successfully');
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
