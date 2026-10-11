import { randomUUID } from "node:crypto";
import { generateRefreshToken, hashPassword, signAccessToken, verifyPassword } from "../auth.utils.js";
import { createUser, fetchUserByEmail, findUserByEmail, storeRefreshToken } from "../repositories/auth.repository.js";

export const registerUser = async (email: string, password: string) => {
    const existingUser = await findUserByEmail(email);

    if (existingUser) throw new Error("USER_ALREADY_EXISTS");

    const passwordHash = await hashPassword(password);

    const record = createUser(email, passwordHash)

    return record;
};

export const loginUser = async (email: string, password: string) => {
    const existingUser = await fetchUserByEmail(email)
    if (!existingUser) throw new Error("INVALID_CREDENTIALS")

    // Verify password with Argon2
    const isValid = await verifyPassword(password, existingUser.password_hash)
    if (!isValid) throw new Error("INVALID_CREDENTIALS")

    // Issue short-lived access token
    const accessToken = signAccessToken({ userId: existingUser.id, role: existingUser.role });

    // Issue refresh token and new family chain
    const { rawToken, tokenHash } = generateRefreshToken();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await storeRefreshToken(existingUser.id, tokenHash, familyId, expiresAt)

    return { 
        accessToken, 
        rawToken,
        user: {
            id: existingUser.id,
            email: existingUser.email,
            role: existingUser.role
        },
     };
}