import express from 'express';
import cookieParser from 'cookie-parser';
import { initDb } from './db.js';
import authRouter from './routes/auth.routes.js';

const app = express();
const PORT = 4000;

app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);

async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Auth server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

startServer();