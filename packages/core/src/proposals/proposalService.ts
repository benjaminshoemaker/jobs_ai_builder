import { readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import {
  AppConfigSchema,
  EventRecordSchema,
  ProposalRecordSchema,
  ScoringRulesRecordSchema,
  SourceRecordSchema,
  type AppConfig,
  type EventRecord,
  type ProposalRecord,
  type ProposalTarget,
} from "../schemas/index.js";
import {
  appendEvent,
  atomicWriteJson,
  createStoragePaths,
  readJsonFile,
} from "../storage/index.js";
import { createDefaultConfig, createDefaultScoringRules, loadConfig, saveConfig } from "../config/index.js";

export type CreateProposalInput = {
  kind: ProposalRecord["kind"];
  targets: ProposalTarget[];
  summary: string;
  evidence: string[];
  proposedChange: Record<string, unknown>;
  createdAt: string;
  scoringVersionFrom?: string;
};

export type ProposalDecision = "approved" | "rejected" | "deferred";

export async function createProposal(dataDir: string, input: CreateProposalInput): Promise<ProposalRecord> {
  const paths = createStoragePaths(dataDir);
  const proposal = ProposalRecordSchema.parse({
    schemaVersion: 1,
    id: `proposal_${hash(input.summary, input.createdAt)}`,
    createdAt: input.createdAt,
    status: "pending",
    kind: input.kind,
    targets: input.targets,
    summary: input.summary,
    evidence: input.evidence,
    proposedChange: input.proposedChange,
    ...(input.scoringVersionFrom ? { scoringVersionFrom: input.scoringVersionFrom } : {}),
  });
  await atomicWriteJson(path.join(paths.proposalsDir, `${proposal.id}.json`), ProposalRecordSchema, proposal);
  await appendProposalEvent(dataDir, proposal, "proposal.created", input.createdAt);
  return proposal;
}

export async function listProposals(dataDir: string): Promise<ProposalRecord[]> {
  const { proposalsDir } = createStoragePaths(dataDir);
  let fileNames: string[];
  try {
    fileNames = await readdir(proposalsDir);
  } catch (error) {
    if (isMissingFileError(error)) return [];
    throw error;
  }

  const proposals = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(".json"))
      .map((fileName) => readJsonFile(path.join(proposalsDir, fileName), ProposalRecordSchema)),
  );
  return proposals.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function getProposal(dataDir: string, proposalId: string): Promise<ProposalRecord> {
  const paths = createStoragePaths(dataDir);
  return readJsonFile(path.join(paths.proposalsDir, `${proposalId}.json`), ProposalRecordSchema);
}

export async function decideProposal(
  dataDir: string,
  proposalId: string,
  decision: ProposalDecision,
  now: string,
): Promise<ProposalRecord> {
  const paths = createStoragePaths(dataDir);
  const proposal = await getProposal(dataDir, proposalId);
  const decided = ProposalRecordSchema.parse({
    ...proposal,
    status: decision,
    decidedAt: now,
  });
  await atomicWriteJson(path.join(paths.proposalsDir, `${proposal.id}.json`), ProposalRecordSchema, decided);
  await appendProposalEvent(dataDir, decided, `proposal.${decision}`, now);

  if (decision !== "approved") {
    return decided;
  }

  await applyProposalChange(dataDir, decided, now);
  const applied = ProposalRecordSchema.parse({
    ...decided,
    appliedAt: now,
  });
  await atomicWriteJson(path.join(paths.proposalsDir, `${proposal.id}.json`), ProposalRecordSchema, applied);
  await appendProposalEvent(dataDir, applied, "proposal.applied", now);
  return applied;
}

async function applyProposalChange(dataDir: string, proposal: ProposalRecord, now: string): Promise<void> {
  const change = proposal.proposedChange;
  const type = typeof change.type === "string" ? change.type : undefined;
  if (type === "query.add") {
    const query = expectString(change.query, "query");
    const config = await loadConfig(dataDir).catch(() => saveConfig(dataDir, createDefaultConfig()));
    await saveConfig(dataDir, {
      ...config,
      querySeeds: config.querySeeds.includes(query) ? config.querySeeds : [...config.querySeeds, query],
    });
    return;
  }

  if (type === "preference.set") {
    const key = expectString(change.key, "key") as keyof AppConfig["preferences"];
    const value = change.value;
    const config = await loadConfig(dataDir).catch(() => saveConfig(dataDir, createDefaultConfig()));
    await saveConfig(dataDir, AppConfigSchema.parse({
      ...config,
      preferences: {
        ...config.preferences,
        [key]: value,
      },
    }));
    return;
  }

  if (type === "config.patch") {
    const patch = expectRecord(change.patch, "patch");
    const config = await loadConfig(dataDir).catch(() => saveConfig(dataDir, createDefaultConfig()));
    await saveConfig(dataDir, AppConfigSchema.parse({ ...config, ...patch }));
    return;
  }

  if (type === "source.disable") {
    const sourceId = expectString(change.sourceId, "sourceId");
    const paths = createStoragePaths(dataDir);
    const sourceFile = path.join(paths.sourcesDir, `${sourceId}.json`);
    const source = await readJsonFile(sourceFile, SourceRecordSchema);
    await atomicWriteJson(sourceFile, SourceRecordSchema, { ...source, enabled: false });
    return;
  }

  if (type === "scoring.weight") {
    const signalId = expectString(change.signalId, "signalId");
    const delta = expectNumber(change.delta, "delta");
    const paths = createStoragePaths(dataDir);
    const current = await readJsonFile(paths.scoringRulesFile, ScoringRulesRecordSchema).catch(() =>
      createDefaultScoringRules(now),
    );
    await atomicWriteJson(paths.scoringRulesFile, ScoringRulesRecordSchema, {
      ...current,
      updatedAt: now,
      signalWeights: {
        ...current.signalWeights,
        [signalId]: (current.signalWeights[signalId] ?? 0) + delta,
      },
    });
    return;
  }

  throw new Error(`Unsupported proposal change type: ${type ?? "unknown"}`);
}

async function appendProposalEvent(
  dataDir: string,
  proposal: ProposalRecord,
  type: EventRecord["type"],
  timestamp: string,
): Promise<EventRecord> {
  const paths = createStoragePaths(dataDir);
  return appendEvent(paths.eventsFile, EventRecordSchema, {
    schemaVersion: 1,
    id: `event_${hash(type, proposal.id, timestamp)}`,
    timestamp,
    actor: "user",
    type,
    payload: {
      proposalId: proposal.id,
      status: proposal.status,
      summary: proposal.summary,
    },
  });
}

function expectString(value: unknown, key: string): string {
  if (typeof value !== "string" || !value) throw new Error(`Expected string proposedChange.${key}`);
  return value;
}

function expectNumber(value: unknown, key: string): number {
  if (typeof value !== "number") throw new Error(`Expected number proposedChange.${key}`);
  return value;
}

function expectRecord(value: unknown, key: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Expected object proposedChange.${key}`);
  }
  return value as Record<string, unknown>;
}

function hash(...parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
