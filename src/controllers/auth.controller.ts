import { type Request, type Response } from "express"
import { loginUser as loginUserService, registerUser as registerUserService } from "../services/auth.service.js";

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
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (
        !email ||
        typeof email !== "string" ||
        !email.includes("@") ||
        !password ||
        typeof password !== "string"
    ) {
        return res.status(400).json({
            error: "A valid email and password are required.",
        });
    }

    try {
        const { accessToken, rawToken, user } = await loginUserService(email, password)

        // Set refresh token in httpOnly cookie
        res.cookie('refreshToken', rawToken, {
            httpOnly: true,       // Prevents access via client-side JavaScript (mitigates XSS)
            secure: process.env.NODE_ENV === 'production', // Transmit only over HTTPS in production
            sameSite: 'strict',   // Defends against CSRF
            path: '/api/auth',    // Restrict cookie to auth routes only
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({ accessToken, user });

    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
            return res.status(401).json({
                error: "Invalid email or password.",
            });
        }
    }

    return res.status(500).json({ error: 'Internal server error.' });
};