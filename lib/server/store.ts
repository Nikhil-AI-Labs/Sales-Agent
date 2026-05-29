import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const runtimeDir = path.join(process.cwd(), "data", "runtime");
const statePath = path.join(runtimeDir, "agent-state.json");
const logPath = path.join(runtimeDir, "message-log.json");
const templatesPath = path.join(runtimeDir, "owner-templates.json");

export type AgentState = {
  agentEnabled: boolean;
  raviEnabled: boolean;
  outboundSalesEnabled: boolean;
  autoSendRaviReplies: boolean;
  updatedAt: string;
};

export type RuntimeLog = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
};

export type OwnerTemplate = {
  id: string;
  name: string;
  language: string;
  body: string;
  category: string;
  createdAt: string;
  updatedAt: string;
};

const defaultState: AgentState = {
  agentEnabled: false,
  raviEnabled: false,
  outboundSalesEnabled: false,
  autoSendRaviReplies: false,
  updatedAt: new Date().toISOString(),
};

async function ensureRuntimeDir() {
  await mkdir(runtimeDir, { recursive: true });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await ensureRuntimeDir();
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function getAgentState(): Promise<AgentState> {
  return readJson(statePath, defaultState);
}

export async function updateAgentState(patch: Partial<Omit<AgentState, "updatedAt">>) {
  const current = await getAgentState();
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await writeJson(statePath, next);
  return next;
}

export async function appendLog(type: string, payload: unknown) {
  const logs = await readJson<RuntimeLog[]>(logPath, []);
  const entry = {
    id: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
  logs.unshift(entry);
  await writeJson(logPath, logs.slice(0, 500));
  return entry;
}

export async function getLogs() {
  return readJson<RuntimeLog[]>(logPath, []);
}

export async function getOwnerTemplates() {
  return readJson<OwnerTemplate[]>(templatesPath, []);
}

export async function saveOwnerTemplate(input: {
  id?: string;
  name: string;
  language: string;
  body: string;
  category?: string;
}) {
  const templates = await getOwnerTemplates();
  const now = new Date().toISOString();
  const existingIndex = input.id ? templates.findIndex((template) => template.id === input.id) : -1;
  const next: OwnerTemplate = {
    id: input.id || crypto.randomUUID(),
    name: input.name.trim(),
    language: input.language.trim() || "en",
    body: input.body.trim(),
    category: input.category?.trim() || "UTILITY",
    createdAt: existingIndex >= 0 ? templates[existingIndex].createdAt : now,
    updatedAt: now,
  };

  const nextTemplates = existingIndex >= 0 ? templates.map((template, index) => (index === existingIndex ? next : template)) : [next, ...templates];
  await writeJson(templatesPath, nextTemplates.slice(0, 200));
  await appendLog(existingIndex >= 0 ? "owner_template_updated" : "owner_template_saved", {
    id: next.id,
    name: next.name,
    language: next.language,
  });
  return next;
}
