import express from 'express';
import cors from 'cors';
import { generateData } from './data.js';
import { reconcile } from './reconcile.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Generate data once on startup
const { transactions, settlements } = generateData();

// API Endpoints
app.get('/api/transactions', (req, res) => {
  res.json(transactions);
});

app.get('/api/settlements', (req, res) => {
  res.json(settlements);
});

app.get('/api/reconcile', (req, res) => {
  const result = reconcile(transactions, settlements);
  res.json(result);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Loaded ${transactions.length} transactions and ${settlements.length} settlements`);
});
