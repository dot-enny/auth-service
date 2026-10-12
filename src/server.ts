import 'dotenv/config';
import app from "./app.js";
import { initDb, startTokenCleanupScheduler } from './db.js';

const PORT = Number(process.env.PORT ?? 4000);

async function startServer() {
  try {
    await initDb();

    // Start hourly background purge job
    startTokenCleanupScheduler();

    app.listen(PORT, () => {
      console.log(`Auth server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

startServer();