import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { initDb, pool } from "../src/db.js";
import { cleanupTestUser, createTestUser } from "./test-helpers.js";

describe("Protected routes", () => {
    const testUser = createTestUser();

    beforeAll(async () => {
        await initDb();
        await request(app).post("/api/auth/register").send(testUser);
    });
    afterAll(async () => {
        await cleanupTestUser(testUser.email);
        await pool.end();
    });

    it("blocks unauthenticated access", async () => {
        const response = await request(app).get("/api/profile");

        expect(response.status).toBe(401);
    });

    it("allows access with a valid bearer token", async () => {
        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send(testUser);

        expect(loginResponse.status).toBe(200);

        const profileResponse = await request(app)
            .get("/api/profile")
            .set("Authorization", `Bearer ${loginResponse.body.accessToken}`);

        expect(profileResponse.status).toBe(200);
        expect(profileResponse.body.user.email).toBe(testUser.email.toLowerCase());
    });
});