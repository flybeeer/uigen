// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

// vi.hoisted ensures the store is initialized before the vi.mock factory runs
const cookieJar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value !== undefined ? { value } : undefined;
    },
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  })),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";

const COOKIE_NAME = "auth-token";
const TEST_SECRET = new TextEncoder().encode("development-secret-key");

async function signToken(
  payload: Record<string, unknown>,
  expirationTime: string | number = "7d"
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expirationTime)
    .setIssuedAt()
    .sign(TEST_SECRET);
}

function makeRequest(token?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        name === COOKIE_NAME && token ? { value: token } : undefined,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  cookieJar.clear();
});

// ── createSession ─────────────────────────────────────────────────────────────

test("createSession sets the auth-token cookie", async () => {
  await createSession("user-1", "user@example.com");
  expect(cookieJar.has(COOKIE_NAME)).toBe(true);
});

test("createSession stores a JWT containing userId and email", async () => {
  await createSession("user-1", "user@example.com");
  const token = cookieJar.get(COOKIE_NAME)!;
  const { payload } = await jwtVerify(token, TEST_SECRET);
  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("user@example.com");
});

test("createSession JWT expires in ~7 days", async () => {
  await createSession("user-1", "user@example.com");
  const token = cookieJar.get(COOKIE_NAME)!;
  const { payload } = await jwtVerify(token, TEST_SECRET);
  const sevenDaysFromNow = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  // Allow ±10 seconds of tolerance
  expect(payload.exp).toBeGreaterThan(sevenDaysFromNow - 10);
  expect(payload.exp).toBeLessThanOrEqual(sevenDaysFromNow + 10);
});

// ── getSession ────────────────────────────────────────────────────────────────

test("getSession returns null when no cookie is present", async () => {
  expect(await getSession()).toBeNull();
});

test("getSession returns the session payload from a valid cookie", async () => {
  const token = await signToken({
    userId: "user-1",
    email: "user@example.com",
    expiresAt: new Date().toISOString(),
  });
  cookieJar.set(COOKIE_NAME, token);
  const session = await getSession();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("user@example.com");
});

test("getSession returns null for a malformed token", async () => {
  cookieJar.set(COOKIE_NAME, "not.a.valid.jwt");
  expect(await getSession()).toBeNull();
});

test("getSession returns null for an expired JWT", async () => {
  const token = await signToken(
    { userId: "user-1", email: "user@example.com", expiresAt: new Date().toISOString() },
    Math.floor(Date.now() / 1000) - 3600 // expired 1 hour ago
  );
  cookieJar.set(COOKIE_NAME, token);
  expect(await getSession()).toBeNull();
});

test("getSession returns null for a JWT signed with the wrong secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "user-1", email: "user@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);
  cookieJar.set(COOKIE_NAME, token);
  expect(await getSession()).toBeNull();
});

// ── deleteSession ─────────────────────────────────────────────────────────────

test("deleteSession removes the auth-token cookie", async () => {
  cookieJar.set(COOKIE_NAME, "some-token");
  await deleteSession();
  expect(cookieJar.has(COOKIE_NAME)).toBe(false);
});

test("deleteSession is a no-op when no cookie exists", async () => {
  await expect(deleteSession()).resolves.not.toThrow();
});

// ── verifySession ─────────────────────────────────────────────────────────────

test("verifySession returns null when request has no cookie", async () => {
  expect(await verifySession(makeRequest())).toBeNull();
});

test("verifySession returns session payload from a valid request cookie", async () => {
  const token = await signToken({
    userId: "user-2",
    email: "other@example.com",
    expiresAt: new Date().toISOString(),
  });
  const session = await verifySession(makeRequest(token));
  expect(session?.userId).toBe("user-2");
  expect(session?.email).toBe("other@example.com");
});

test("verifySession returns null for a malformed request token", async () => {
  expect(await verifySession(makeRequest("bad.token.here"))).toBeNull();
});

test("verifySession returns null for an expired request token", async () => {
  const token = await signToken(
    { userId: "user-2", email: "other@example.com", expiresAt: new Date().toISOString() },
    Math.floor(Date.now() / 1000) - 3600
  );
  expect(await verifySession(makeRequest(token))).toBeNull();
});

test("verifySession returns null for a token signed with the wrong secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "user-2", email: "other@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);
  expect(await verifySession(makeRequest(token))).toBeNull();
});

// ── round-trip ────────────────────────────────────────────────────────────────

test("createSession then getSession returns the original user data", async () => {
  await createSession("rt-user", "roundtrip@example.com");
  const session = await getSession();
  expect(session?.userId).toBe("rt-user");
  expect(session?.email).toBe("roundtrip@example.com");
});

test("createSession then deleteSession then getSession returns null", async () => {
  await createSession("rt-user", "roundtrip@example.com");
  await deleteSession();
  expect(await getSession()).toBeNull();
});