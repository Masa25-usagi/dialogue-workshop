import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  DomainError,
  DomainState,
  type AgreementChoice,
  type ContributionTag,
  type InsightKind,
  type RoomMode,
  type Stage,
  type VoteChoice,
} from "./domain.ts";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;
const MAX_BODY_BYTES = 64 * 1024;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

type JsonObject = Record<string, unknown>;
type ServerOptions = { host?: string; port?: number; state?: DomainState };

function jsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DomainError(400, "invalid_json_object");
  return value as JsonObject;
}

function requiredString(body: JsonObject, key: string, max = 500) {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0 || value.length > max) throw new DomainError(400, `invalid_${key}`);
  return value;
}

function optionalString(body: JsonObject, key: string, max = 500) {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > max) throw new DomainError(400, `invalid_${key}`);
  return value;
}

function booleanValue(body: JsonObject, key: string, fallback?: boolean) {
  const value = body[key];
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "boolean") throw new DomainError(400, `invalid_${key}`);
  return value;
}

function integerValue(body: JsonObject, key: string, fallback?: number) {
  const value = body[key];
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value)) throw new DomainError(400, `invalid_${key}`);
  return value;
}

function stringArrayValue(body: JsonObject, key: string, fallback: string[] = []) {
  const value = body[key];
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new DomainError(400, `invalid_${key}`);
  return value;
}

function tokenFromRequest(req: IncomingMessage) {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !/^Bearer\s+/i.test(header)) return null;
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 ? token : null;
}

function requireToken(req: IncomingMessage) {
  const token = tokenFromRequest(req);
  if (!token) throw new DomainError(401, "authentication_required");
  return token;
}

function sendJson(res: ServerResponse, status: number, value: unknown, headers: Record<string, string> = {}) {
  const payload = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  res.end(payload);
}

function sendEmpty(res: ServerResponse, status: number, headers: Record<string, string> = {}) {
  res.writeHead(status, headers);
  res.end();
}

function loopbackOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" || url.protocol === "https:") && LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function applyOriginPolicy(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  if (typeof origin !== "string" || !loopbackOrigin(origin)) {
    sendJson(res, 403, { error: "origin_not_allowed" });
    return false;
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "300");
  return true;
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new DomainError(413, "request_too_large");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DomainError(400, "invalid_json");
  }
}

function segmentsFromUrl(req: IncomingMessage) {
  const rawUrl = req.url ?? "/";
  let pathname: string;
  try {
    pathname = new URL(rawUrl, "http://127.0.0.1").pathname;
  } catch {
    throw new DomainError(400, "invalid_url");
  }
  try {
    return pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
  } catch {
    throw new DomainError(400, "invalid_url");
  }
}

function methodNotAllowed(res: ServerResponse, methods: string[]) {
  sendJson(res, 405, { error: "method_not_allowed" }, { Allow: methods.join(", ") });
}

function errorResponse(res: ServerResponse, error: unknown) {
  if (error instanceof DomainError) {
    sendJson(res, error.status, { error: error.message });
    return;
  }
  sendJson(res, 500, { error: "internal_error" });
}

function roomIdAt(path: string[]) {
  if (path[0] !== "rooms" || !path[1]) throw new DomainError(404, "not_found");
  return path[1];
}

function pathSegment(path: string[], index: number) {
  const segment = path[index];
  if (!segment) throw new DomainError(404, "not_found");
  return segment;
}

async function route(req: IncomingMessage, res: ServerResponse, state: DomainState) {
  if (!applyOriginPolicy(req, res)) return;
  if (req.method === "OPTIONS") {
    sendEmpty(res, 204, { "Content-Length": "0" });
    return;
  }
  const path = segmentsFromUrl(req);
  if (req.method === "GET" && path.length === 1 && path[0] === "health") {
    sendJson(res, 200, { ok: true, storage: "memory", externalAi: false });
    return;
  }
  if (req.method === "POST" && path.length === 1 && path[0] === "rooms") {
    const body = jsonObject(await readBody(req));
    const mode = requiredString(body, "mode", 10) as RoomMode;
    const topic = requiredString(body, "topic", 120);
    sendJson(res, 201, state.createRoom(mode, topic));
    return;
  }
  if (path[0] !== "rooms" || !path[1]) throw new DomainError(404, "not_found");
  const roomId = roomIdAt(path);

  if (req.method === "POST" && path.length === 3 && path[2] === "join") {
    const body = jsonObject(await readBody(req));
    const displayName = requiredString(body, "displayName", 40);
    const adultConfirmed = booleanValue(body, "adultConfirmed", false);
    const consented = booleanValue(body, "consented", booleanValue(body, "consent", false));
    sendJson(res, 201, state.joinRoom(roomId, displayName, adultConfirmed, consented));
    return;
  }

  const token = requireToken(req);
  if (req.method === "GET" && path.length === 3 && (path[2] === "snapshot" || path[2] === "state")) {
    sendJson(res, 200, state.getSnapshot(roomId, token));
    return;
  }
  if (req.method === "GET" && path.length === 3 && path[2] === "report") {
    sendJson(res, 200, state.getPersonalReport(roomId, token));
    return;
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "consent") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.setConsent(
      roomId,
      token,
      booleanValue(body, "adultConfirmed"),
      booleanValue(body, "consented", booleanValue(body, "consent")),
    ));
    return;
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "leave") {
    sendJson(res, 200, state.leaveRoom(roomId, token));
    return;
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "rejoin") {
    sendJson(res, 200, state.rejoinRoom(roomId, token));
    return;
  }
  if (req.method === "DELETE" && path.length === 3 && path[2] === "me") {
    sendJson(res, 200, state.deleteParticipantData(roomId, token));
    return;
  }
  if (req.method === "DELETE" && path.length === 2) {
    sendJson(res, 200, state.deleteRoom(roomId, token));
    return;
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "stage") {
    const body = jsonObject(await readBody(req));
    const stage = optionalString(body, "stage", 20);
    sendJson(res, 200, stage ? state.setStage(roomId, token, stage as Stage) : state.advanceStage(roomId, token));
    return;
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "timer") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.setTimer(roomId, token, integerValue(body, "durationSeconds")));
    return;
  }
  if (req.method === "POST" && path.length === 4 && path[2] === "presentation" && path[3] === "navigate") {
    const body = jsonObject(await readBody(req));
    const rawDirection = optionalString(body, "direction", 20);
    const direction = rawDirection === "previous" || rawDirection === "next" ? rawDirection : undefined;
    if (rawDirection !== undefined && direction === undefined) throw new DomainError(400, "invalid_navigation");
    sendJson(res, 200, state.navigatePresentation(roomId, token, {
      direction,
      index: body.index === undefined ? undefined : integerValue(body, "index"),
      expectedRevision: body.expectedRevision === undefined ? undefined : integerValue(body, "expectedRevision"),
    }));
    return;
  }
  if (req.method === "POST" && path.length === 4 && path[2] === "presentation" && path[3] === "reveal") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.revealPresentation(
      roomId,
      token,
      booleanValue(body, "reveal", true),
      body.expectedRevision === undefined ? undefined : integerValue(body, "expectedRevision"),
    ));
    return;
  }
  if (req.method === "POST" && path.length === 5 && path[2] === "slides" && path[4] === "respond") {
    const body = jsonObject(await readBody(req));
    const value = body.value;
    if (typeof value !== "string" && typeof value !== "number") throw new DomainError(400, "invalid_slide_response");
    const clientMutationId = optionalString(body, "clientMutationId", 100);
    sendJson(res, 200, state.respondToSlide(roomId, token, pathSegment(path, 3), value, clientMutationId));
    return;
  }
  if (req.method === "POST" && path.length === 4 && path[2] === "groups" && path[3] === "auto") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.autoAssignGroups(roomId, token, integerValue(body, "groupSize", 3)));
    return;
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "stance") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.setStance(roomId, token, requiredString(body, "choice", 20) as VoteChoice));
    return;
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "interview") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.setInterviewAnswer(roomId, token, optionalString(body, "answer", 1000) ?? ""));
    return;
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "messages") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 201, state.addMessage(roomId, token, requiredString(body, "text")));
    return;
  }
  if ((req.method === "PATCH" || req.method === "DELETE") && path.length === 4 && path[2] === "messages") {
    if (req.method === "DELETE") {
      sendJson(res, 200, state.deleteMessage(roomId, token, pathSegment(path, 3)));
      return;
    }
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.updateMessage(roomId, token, pathSegment(path, 3), requiredString(body, "text")));
    return;
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "insights") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 201, state.upsertInsight(roomId, token, {
      id: optionalString(body, "id", 80),
      kind: requiredString(body, "kind", 20) as InsightKind,
      text: requiredString(body, "text"),
      sourceMessageIds: stringArrayValue(body, "sourceMessageIds"),
    }));
    return;
  }
  if (req.method === "PATCH" && path.length === 4 && path[2] === "insights") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.upsertInsight(roomId, token, {
      id: pathSegment(path, 3),
      kind: requiredString(body, "kind", 20) as InsightKind,
      text: requiredString(body, "text"),
      sourceMessageIds: stringArrayValue(body, "sourceMessageIds"),
    }));
    return;
  }
  if (req.method === "POST" && path.length === 5 && path[2] === "insights" && path[4] === "confirm") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.confirmInsight(roomId, token, pathSegment(path, 3), booleanValue(body, "confirmed")));
    return;
  }
  if (req.method === "POST" && path.length === 5 && path[2] === "insights" && path[4] === "corrections") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 201, state.suggestInsightCorrection(roomId, token, pathSegment(path, 3), requiredString(body, "text")));
    return;
  }
  if (req.method === "POST" && path.length === 4 && path[2] === "corrections") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.resolveInsightCorrection(roomId, token, pathSegment(path, 3), booleanValue(body, "accept")));
    return;
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "proposals") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 201, state.createProposal(roomId, token, requiredString(body, "text"), stringArrayValue(body, "relatedMessageIds")));
    return;
  }
  if (req.method === "PATCH" && path.length === 4 && path[2] === "proposals") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.updateProposal(
      roomId,
      token,
      pathSegment(path, 3),
      requiredString(body, "text"),
      body.relatedMessageIds === undefined ? undefined : stringArrayValue(body, "relatedMessageIds"),
    ));
    return;
  }
  if (req.method === "POST" && path.length === 5 && path[2] === "proposals" && path[4] === "like") {
    sendJson(res, 200, state.toggleProposalLike(roomId, token, pathSegment(path, 3)));
    return;
  }
  if (req.method === "POST" && path.length === 5 && path[2] === "proposals" && path[4] === "agreement") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.setProposalAgreement(roomId, token, pathSegment(path, 3), requiredString(body, "choice", 20) as AgreementChoice));
    return;
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "contributions") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.setContributionTag(roomId, token, requiredString(body, "targetId", 80), requiredString(body, "tag", 20) as ContributionTag));
    return;
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "feedback") {
    const body = jsonObject(await readBody(req));
    sendJson(res, 200, state.submitFeedback(roomId, token, integerValue(body, "rating"), optionalString(body, "comment", 500) ?? ""));
    return;
  }
  methodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE"]);
}

export function createHttpServer(state = new DomainState()): Server {
  return createServer((req, res) => {
    route(req, res, state).catch((error: unknown) => errorResponse(res, error));
  });
}

export async function startServer(options: ServerOptions = {}) {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const server = createHttpServer(options.state);
  await new Promise<void>((resolveStart, rejectStart) => {
    const onError = (error: Error) => {
      server.off("listening", resolveStart);
      rejectStart(error);
    };
    server.once("error", onError);
    server.listen(port, host, () => {
      server.off("error", onError);
      resolveStart();
    });
  });
  return server;
}

function mainModule() {
  const current = process.argv[1];
  return current !== undefined && resolve(current) === fileURLToPath(import.meta.url);
}

if (mainModule()) {
  const portValue = Number(process.env.PORT ?? DEFAULT_PORT);
  const port = Number.isInteger(portValue) && portValue >= 0 && portValue <= 65535 ? portValue : DEFAULT_PORT;
  startServer({ port })
    .then((server) => {
      const address = server.address();
      const shownPort = typeof address === "object" && address !== null ? address.port : port;
      process.stdout.write(`dialogue-server listening on ${DEFAULT_HOST}:${shownPort}\n`);
    })
    .catch((error: unknown) => {
      process.stderr.write(`dialogue-server: ${error instanceof Error ? error.message : "startup_failed"}\n`);
      process.exitCode = 1;
    });
}
