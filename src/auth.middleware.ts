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
    const bearerMatch = authHeader?.match(/^Bearer[ \t]+([^ \t]+)[ \t]*$/);

    if (!bearerMatch) {
        return res.status(401).json({
            error: "Bearer access token required.",
        });
    }

    const token = bearerMatch[1];
    const payload = verifyAccessToken(token as string);

    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired access token.' });
    }

    req.user = payload;
    return next();
}