import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type TokenPayload } from './auth.utils.js';

// Extend Express Request interface to include the authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token as string);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired access token.' });
  }

  req.user = payload;
  next();
}