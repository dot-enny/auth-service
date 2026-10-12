import type { Response } from "supertest";
import { pool } from "../src/db.js";

export function getRefreshCookie(response: Response): string {
    const cookies = response.headers["set-cookie"];
    const cookie = cookies?.find((value) => value.startsWith("refreshToken="));

    if (!cookie) {
        throw new Error("Refresh token cookie was not set");
    }

    return cookie.split(";")[0]!;
}

export function createTestUser() {
    return {
        email: `test-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
        password: "StrongPassword123!",
    };
}

export async function cleanupTestUser(email: string) {
    await pool.query("DELETE FROM users WHERE email = $1", [email.toLowerCase()]);
}