import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ModelRegistry } from "../src/model-resolver.js";
import {
  getScopedModelListing,
  resolveSubagentModelSelection,
  serializeScopedModelListing,
} from "../src/scoped-models.js";

const MODELS = [
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "anthropic" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic" },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
];

function registry(models = MODELS): ModelRegistry {
  return {
    find(provider: string, modelId: string) {
      return models.find(m => m.provider === provider && m.id === modelId);
    },
    getAll() {
      return models;
    },
    getAvailable() {
      return models;
    },
  };
}

function writeSettings(cwd: string, enabledModels: string[] | undefined) {
  mkdirSync(join(cwd, ".pi"), { recursive: true });
  writeFileSync(join(cwd, ".pi", "settings.json"), JSON.stringify({ enabledModels }, null, 2));
}

describe("scoped model listing and selection", () => {
  let cwd: string;
  let agentDir: string;
  let oldAgentDir: string | undefined;

  beforeEach(() => {
    oldAgentDir = process.env.PI_CODING_AGENT_DIR;
    cwd = join(tmpdir(), `pi-subagents-scope-${Math.random().toString(36).slice(2)}`);
    agentDir = join(tmpdir(), `pi-subagents-agent-${Math.random().toString(36).slice(2)}`);
    mkdirSync(cwd, { recursive: true });
    mkdirSync(agentDir, { recursive: true });
    process.env.PI_CODING_AGENT_DIR = agentDir;
  });

  afterEach(() => {
    if (oldAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = oldAgentDir;
    rmSync(cwd, { recursive: true, force: true });
    rmSync(agentDir, { recursive: true, force: true });
  });

  it("falls back to available models when no scoped settings exist", () => {
    const listing = getScopedModelListing({ cwd, modelRegistry: registry() });
    expect(listing.source).toBe("available-fallback");
    expect(listing.hardBoundary).toBe(false);
    expect(listing.requiresExplicitModel).toBe(false);
    expect(listing.models.map(m => m.id)).toContain("anthropic/claude-sonnet-4-6");
  });

  it("resolves saved scoped model settings into a hard-boundary listing", () => {
    writeSettings(cwd, ["anthropic/claude-sonnet-4-6:high", "openai/gpt-4o"]);
    const listing = getScopedModelListing({ cwd, modelRegistry: registry() });
    expect(listing.source).toBe("settings");
    expect(listing.hardBoundary).toBe(true);
    expect(listing.requiresExplicitModel).toBe(true);
    expect(listing.models.map(m => m.id)).toEqual(["anthropic/claude-sonnet-4-6", "openai/gpt-4o"]);
    expect(listing.models[0].thinkingLevel).toBe("high");
  });

  it("serializes pretty JSON without internal model objects", () => {
    writeSettings(cwd, ["sonnet:low"]);
    const parsed = JSON.parse(serializeScopedModelListing(getScopedModelListing({ cwd, modelRegistry: registry() })));
    expect(parsed.source).toBe("settings");
    expect(parsed.models[0]).toMatchObject({
      id: "anthropic/claude-sonnet-4-6",
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      name: "Claude Sonnet 4.6",
      thinkingLevel: "low",
    });
    expect(parsed.models[0].model).toBeUndefined();
  });

  it("requires explicit model and resolves fuzzy input within scoped models", () => {
    writeSettings(cwd, ["anthropic/claude-sonnet-4-6:high", "openai/gpt-4o"]);

    const missing = resolveSubagentModelSelection({ cwd, modelRegistry: registry() }, {
      configModel: "anthropic/claude-haiku-4-5-20251001",
      configThinking: "minimal",
      requireExplicitModel: true,
    });
    expect(missing).toContain("no model was selected");

    const selected = resolveSubagentModelSelection({ cwd, modelRegistry: registry() }, {
      modelParam: "sonnet",
      configModel: "anthropic/claude-haiku-4-5-20251001",
      configThinking: "minimal",
      requireExplicitModel: true,
    });
    expect(typeof selected).not.toBe("string");
    if (typeof selected === "string") throw new Error(selected);
    expect(selected.model.id).toBe("claude-sonnet-4-6");
    expect(selected.thinking).toBe("high");
  });

  it("rejects model choices outside a scoped model set", () => {
    writeSettings(cwd, ["anthropic/claude-sonnet-4-6"]);
    const selected = resolveSubagentModelSelection({ cwd, modelRegistry: registry() }, {
      modelParam: "openai/gpt-4o",
      requireExplicitModel: true,
    });
    expect(selected).toContain("outside the scoped model set");
    expect(selected).toContain("anthropic/claude-sonnet-4-6");
  });

  it("uses params over config when no scoped set exists", () => {
    const selected = resolveSubagentModelSelection({ cwd, modelRegistry: registry() }, {
      modelParam: "openai/gpt-4o",
      configModel: "anthropic/claude-haiku-4-5-20251001",
      thinkingParam: "high",
      configThinking: "minimal",
      requireExplicitModel: true,
    });
    expect(typeof selected).not.toBe("string");
    if (typeof selected === "string") throw new Error(selected);
    expect(selected.model.id).toBe("gpt-4o");
    expect(selected.thinking).toBe("high");
  });

  it("keeps an empty saved scope as a hard boundary", () => {
    writeSettings(cwd, ["does-not-exist"]);
    const listing = getScopedModelListing({ cwd, modelRegistry: registry() });
    expect(listing.source).toBe("settings");
    expect(listing.hardBoundary).toBe(true);
    expect(listing.models).toEqual([]);
    expect(listing.warnings.join("\n")).toContain("resolved to no available models");
  });
});
