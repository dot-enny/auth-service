import { type Request, type Response } from "express"
import { getUser, loginUser as loginUserService, logoutUser as logoutUserService, refreshToken as refreshTokenService, registerUser as registerUserService } from "../services/auth.service.js";

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

        console.error("Registration error:", error);
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
        console.error("Login error:", error);

        if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
            return res.status(401).json({
                error: "Invalid email or password.",
            });
        }

        console.error("Login error:", error);
    }

    return res.status(500).json({ error: 'Internal server error.' });
};

export const refresh = async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies.refreshToken;

    if (!rawRefreshToken) {
        return res.status(401).json({ error: 'Refresh token cookie missing.' });
    }

    try {
        const { newAccessToken, nextRawToken } = await refreshTokenService(rawRefreshToken);

        // Update client cookie with the rotated token
        res.cookie('refreshToken', nextRawToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            accessToken: newAccessToken,
        });

    } catch (error) {
        if (!(error instanceof Error)) {
            console.error("Refresh token error:", error);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        res.clearCookie('refreshToken', { path: '/api/auth' });

        switch (error.message) {
            case "INVALID_REFRESH_TOKEN":
                return res.status(401).json({ error: "Invalid refresh token." });

            case "SESSION_COMPROMISED":
                return res.status(403).json({ error: 'Compromised session detected. All sessions revoked.' });

            case "TOKEN_EXPIRED":
                return res.status(401).json({ error: 'Refresh token has expired.' });

            default:
                console.error("Refresh token error:", error);
                break;
        }
    }

    return res.status(500).json({ error: 'Internal server error.' });
}

export const testProtected = async (req: Request, res: Response) => {
    // req.user is guaranteed to exist by requireAuth
    const userId = req.user!.userId;
    try {
        const user = await getUser(userId);
        return res.status(200).json({ user });

    } catch (error) {
        if (error instanceof Error && error.message === "USER_NOT_FOUND") {
            return res.status(404).json({ error: 'User not found.' });
        }

        console.error("Protected route error:", error);
    }

    return res.status(500).json({ error: 'Internal server error.' });
}

export const logout = async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies.refreshToken;

    if (rawRefreshToken) {
        try {
            await logoutUserService(rawRefreshToken)
        } catch (error) {
            console.error('Error during token revocation on logout:', error);
        }
    }

    // Clear cookie from the client regardless of DB outcome
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
    });

    return res.status(200).json({ message: 'Logged out successfully.' });
}