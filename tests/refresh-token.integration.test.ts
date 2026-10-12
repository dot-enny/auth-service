import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { initDb, pool } from "../src/db.js";
import { cleanupTestUser, createTestUser, getRefreshCookie } from "./test-helpers.js";

describe("Refresh tokens", () => {
    const testUser = createTestUser();

    beforeAll(async () => {
        await initDb();
        await request(app).post("/api/auth/register").send(testUser);
    });
    afterAll(async () => {
        await cleanupTestUser(testUser.email);
        await pool.end();
    });

    it("rotates tokens and detects reuse", async () => {
        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send(testUser);

        expect(loginResponse.status).toBe(200);
        const initialCookie = getRefreshCookie(loginResponse);

        const refreshResponse = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", initialCookie);

        expect(refreshResponse.status).toBe(200);
        expect(refreshResponse.body).toHaveProperty("accessToken");

        const rotatedCookie = getRefreshCookie(refreshResponse);
        expect(rotatedCookie).not.toBe(initialCookie);

        const reuseResponse = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", initialCookie);

        expect(reuseResponse.status).toBe(403);
        expect(reuseResponse.body.error).toMatch(/Compromised session detected/i);

        const revokedFamilyResponse = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", rotatedCookie);

        expect(revokedFamilyResponse.status).toBe(403);
    });
});