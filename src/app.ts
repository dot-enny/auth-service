import express from "express";
import authRoutes from './routes/auth.routes.js'
import protectedRoutes from './routes/protected.routes.js';
import cookieParser from "cookie-parser";
import { requireAuth } from './auth.middleware.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api', requireAuth, protectedRoutes);

export default app;

