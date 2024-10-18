import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors'; 
import ruleRoutes from './routes/ruleRoutes.js';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

// Apply CORS middleware
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from this frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  credentials: true, // Allow credentials if needed (cookies, auth, etc.)
})); 

// Middleware to parse JSON requests
app.use(bodyParser.json());

// MongoDB Connection 
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Use Routes
app.use('/api/rules', ruleRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
