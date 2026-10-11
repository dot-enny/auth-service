import { type Request, type Response } from "express"
import { registerUser as registerUserService } from "../services/auth.service.js";

export const register = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Basic sanity validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    try {
        const user = await registerUserService(email, password);

        return res.status(201).json({ user });

    } catch (error) {
        if (error instanceof Error && error.message === "USER_ALREADY_EXISTS") {
            return res.status(409).json({
                error: "A user with this email already exists.",
            });
        }
    }
    return res.status(500).json({ error: 'Internal server error.' });
}