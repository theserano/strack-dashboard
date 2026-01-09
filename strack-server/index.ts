import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import router from './routes';

dotenv.config({ path: './src/configs/.env' });
const app = express();
const PORT = process.env.PORT || 3000;
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());

// main route
app.use('/strack-api', router);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || '').then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});