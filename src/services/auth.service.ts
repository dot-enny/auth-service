import { randomUUID, createHash } from "node:crypto";
import { generateRefreshToken, hashPassword, signAccessToken, verifyPassword } from "../auth.utils.js";
import { createUser, fetchRefreshToken, fetchUserByEmail, findUserByEmail, findUserById, invalidateToken, invalidateTokenFamily, storeRefreshToken } from "../repositories/auth.repository.js";

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

export const refreshToken = async (rawRefreshToken: string) => {
    // Hash the incoming token to match DB representation
    const incomingHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    const tokenRecord = await fetchRefreshToken(incomingHash);
    if (!tokenRecord) {
        throw new Error("INVALID_REFRESH_TOKEN")
    }

    // REUSE DETECTION TRAP:
    // If a revoked token is used again, the session family has been compromised
    if (tokenRecord.isRevoked) {
        console.warn(`[SECURITY BREACH] Replay attack detected for family_id: ${tokenRecord.family_id}. Revoking entire chain.`);
        // Invalidate all tokens associated with this session family
        await invalidateTokenFamily(tokenRecord.family_id)
        throw new Error("SESSION_COMPROMISED")
    }

    if (new Date() > new Date(tokenRecord.expires_at)) {
        throw new Error("TOKEN_EXPIRED")
    }

    // Invalidate the consumed refresh token
    await invalidateToken(tokenRecord.id)

    // 6. Rotate: Generate next token pair in the same family
    const { rawToken: nextRawToken, tokenHash: nextTokenHash } = generateRefreshToken();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await storeRefreshToken(tokenRecord.user_id, nextTokenHash, tokenRecord.family_id, newExpiresAt)

    // 7. Issue fresh access token
    const newAccessToken = signAccessToken({
      userId: tokenRecord.user_id,
      role: tokenRecord.role,
    });

    return {
        newAccessToken,
        nextRawToken,
    }
}

export const getUser = async (userId: number) => {
    const user = await findUserById(userId);

    if (!user) throw new Error("USER_NOT_FOUND");

    return user;
}