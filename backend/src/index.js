import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import simulateRouter from './routes/simulate.js';
import recommendRouter from './routes/recommend.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) =>
  res.json({ status: 'ok', agent: 'Naija Review Agent' })
);

app.use('/api/simulate', simulateRouter);
app.use('/api/recommend', recommendRouter);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`🇳🇬 Rems Review Agent running on port ${PORT}`)
);
