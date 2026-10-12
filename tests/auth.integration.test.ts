import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { initDb, pool } from "../src/db.js";
import { cleanupTestUser, createTestUser, getRefreshCookie } from "./test-helpers.js";

describe("Authentication", () => {
    const testUser = createTestUser();

    beforeAll(() => initDb());
    afterAll(async () => {
        await cleanupTestUser(testUser.email);
        await pool.end();
    });

    it("registers a user and rejects duplicate emails", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send(testUser);

        expect(response.status).toBe(201);
        expect(response.body.user).toMatchObject({
            email: testUser.email.toLowerCase(),
        });
        expect(response.body.user).toHaveProperty("id");
        expect(response.body.user).not.toHaveProperty("password_hash");

        const duplicateResponse = await request(app)
            .post("/api/auth/register")
            .send(testUser);

        expect(duplicateResponse.status).toBe(409);
    });

    it("logs in with an access token and HTTP-only refresh cookie", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send(testUser);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("accessToken");

        const refreshCookie = getRefreshCookie(response);
        expect(refreshCookie).toMatch(/^refreshToken=/);
        expect(response.headers["set-cookie"]).toEqual(
            expect.arrayContaining([
                expect.stringMatching(/HttpOnly/i),
                expect.stringMatching(/SameSite=Strict/i),
            ])
        );
    });
});