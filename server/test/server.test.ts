import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";
import { DomainState } from "../src/domain.ts";
import { startServer } from "../src/server.ts";

async function closeServer(server: Awaited<ReturnType<typeof startServer>>) {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("HTTP server stays loopback-only and requires bearer auth", async () => {
  const state = new DomainState();
  const server = await startServer({ host: "127.0.0.1", port: 0, state });
  try {
    const address = server.address();
    assert.notEqual(address, null);
    assert.equal(typeof address, "object");
    const base = `http://127.0.0.1:${(address as AddressInfo).port}`;

    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, storage: "memory", externalAi: false });

    const create = await fetch(`${base}/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1" },
      body: JSON.stringify({ mode: "live", topic: "APIの確認" }),
    });
    assert.equal(create.status, 201);
    const created = await create.json() as { roomId: string; hostToken: string };

    const unauthorized = await fetch(`${base}/rooms/${created.roomId}/snapshot`);
    assert.equal(unauthorized.status, 401);

    const externalOrigin = await fetch(`${base}/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example" },
      body: JSON.stringify({ mode: "live", topic: "外部Origin" }),
    });
    assert.equal(externalOrigin.status, 403);
    assert.deepEqual(await externalOrigin.json(), { error: "origin_not_allowed" });

    const join = await fetch(`${base}/rooms/${created.roomId}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "参加者", adultConfirmed: true, consented: true }),
    });
    assert.equal(join.status, 201);
    const joined = await join.json() as { participantToken: string };

    const participantSnapshot = await fetch(`${base}/rooms/${created.roomId}/snapshot`, {
      headers: { authorization: `Bearer ${joined.participantToken}` },
    });
    assert.equal(participantSnapshot.status, 200);
    const snapshot = await participantSnapshot.json() as { me: { displayName: string } | null; hostView: unknown };
    assert.equal(snapshot.me?.displayName, "参加者");
    assert.equal(snapshot.hostView, null);

    const hostSnapshot = await fetch(`${base}/rooms/${created.roomId}/snapshot`, {
      headers: { authorization: `Bearer ${created.hostToken}` },
    });
    assert.equal(hostSnapshot.status, 200);
    const hostBody = await hostSnapshot.json() as { hostView: { privateAnswersOmitted: boolean } | null };
    assert.equal(hostBody.hostView?.privateAnswersOmitted, true);
  } finally {
    await closeServer(server);
  }
});

test("HTTP routes expose validation errors without leaking internals", async () => {
  const server = await startServer({ host: "127.0.0.1", port: 0 });
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("server_address_missing");
    const base = `http://127.0.0.1:${address.port}`;
    const invalid = await fetch(`${base}/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "remote", topic: "invalid" }),
    });
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { error: "invalid_mode" });

    const notFound = await fetch(`${base}/rooms/missing/snapshot`, {
      headers: { authorization: "Bearer unavailable" },
    });
    assert.equal(notFound.status, 404);
    assert.deepEqual(await notFound.json(), { error: "room_not_found" });
  } finally {
    await closeServer(server);
  }
});

test("presentation routes keep navigation host-only and responses on the current slide", async () => {
  const state = new DomainState();
  const server = await startServer({ host: "127.0.0.1", port: 0, state });
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("server_address_missing");
    const base = `http://127.0.0.1:${address.port}`;
    const create = await fetch(`${base}/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "live", topic: "共有スライドAPI" }),
    });
    const created = await create.json() as { roomId: string; hostToken: string };
    const join = await fetch(`${base}/rooms/${created.roomId}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "参加者", adultConfirmed: true, consented: true }),
    });
    const joined = await join.json() as { participantToken: string };
    const participantHeaders = { authorization: `Bearer ${joined.participantToken}`, "content-type": "application/json" };
    const forbiddenNavigate = await fetch(`${base}/rooms/${created.roomId}/presentation/navigate`, { method: "POST", headers: participantHeaders, body: JSON.stringify({ direction: "next" }) });
    assert.equal(forbiddenNavigate.status, 403);
    const initial = await fetch(`${base}/rooms/${created.roomId}/snapshot`, { headers: { authorization: `Bearer ${created.hostToken}` } });
    const initialBody = await initial.json() as { presentation: { revision: number } };
    const navigate = await fetch(`${base}/rooms/${created.roomId}/presentation/navigate`, { method: "POST", headers: { authorization: `Bearer ${created.hostToken}`, "content-type": "application/json" }, body: JSON.stringify({ direction: "next", expectedRevision: initialBody.presentation.revision }) });
    assert.equal(navigate.status, 200);
    const respond = await fetch(`${base}/rooms/${created.roomId}/slides/stance/respond`, { method: "POST", headers: participantHeaders, body: JSON.stringify({ value: "support" }) });
    assert.equal(respond.status, 200);
    const hostSnapshot = await fetch(`${base}/rooms/${created.roomId}/snapshot`, { headers: { authorization: `Bearer ${created.hostToken}` } });
    const hostBody = await hostSnapshot.json() as { presentation: { responseCount: number; responseSummary: Record<string, number>; myResponse: unknown } };
    assert.equal(hostBody.presentation.responseCount, 1);
    assert.equal(hostBody.presentation.responseSummary.support, 1);
    assert.equal(hostBody.presentation.myResponse, null);
  } finally {
    await closeServer(server);
  }
});
