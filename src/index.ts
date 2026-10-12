import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { initDb, startTokenCleanupScheduler } from './db.js';
import authRouter from './routes/auth.routes.js';
import protectedRouter from './routes/protected.routes.js';
import { requireAuth } from './auth.middleware.js';

const app = express();
const PORT = 4000;

app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);
app.use('/api', requireAuth, protectedRouter);

async function startServer() {
  try {
    await initDb();

    // Start hourly background purge job
    startTokenCleanupScheduler();

    app.listen(PORT, () => {
      console.log(`Auth server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

startServer();