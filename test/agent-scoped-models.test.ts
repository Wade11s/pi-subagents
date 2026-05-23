import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/agent-runner.js", async () => {
  const actual = await vi.importActual<typeof import("../src/agent-runner.js")>("../src/agent-runner.js");
  return {
    ...actual,
    runAgent: vi.fn(),
  };
});

import { runAgent } from "../src/agent-runner.js";
import subagentsExtension from "../src/index.js";

const sonnet = { id: "claude-sonnet-4-6", provider: "anthropic", name: "Claude Sonnet 4.6" };
const haiku = { id: "claude-haiku-4-5-20251001", provider: "anthropic", name: "Claude Haiku 4.5" };
const gpt = { id: "gpt-4o", provider: "openai", name: "GPT-4o" };
const models = [sonnet, haiku, gpt];

function makePi() {
  const tools = new Map<string, any>();
  const handlers = new Map<string, any>();
  return {
    pi: {
      registerMessageRenderer: vi.fn(),
      registerTool: vi.fn((tool: any) => tools.set(tool.name, tool)),
      registerCommand: vi.fn(),
      on: vi.fn((event: string, handler: any) => handlers.set(event, handler)),
      events: { emit: vi.fn(), on: vi.fn(() => vi.fn()) },
      appendEntry: vi.fn(),
      sendMessage: vi.fn(),
    } as any,
    tools,
    handlers,
  };
}

function makeCtx(cwd: string) {
  return {
    hasUI: false,
    ui: { setStatus: vi.fn(), setWidget: vi.fn() },
    cwd,
    model: haiku,
    modelRegistry: {
      find: vi.fn((provider: string, id: string) => models.find(m => m.provider === provider && m.id === id)),
      getAll: vi.fn(() => models),
      getAvailable: vi.fn(() => models),
    },
    sessionManager: { getSessionId: vi.fn(() => "session-1"), getBranch: vi.fn(() => []) },
    getSystemPrompt: vi.fn(() => "parent prompt"),
  } as any;
}

function writeSettings(cwd: string, enabledModels: string[]) {
  mkdirSync(join(cwd, ".pi"), { recursive: true });
  writeFileSync(join(cwd, ".pi", "settings.json"), JSON.stringify({ enabledModels }, null, 2));
}

describe("Agent tool scoped model enforcement", () => {
  let cwd: string;
  let agentDir: string;
  let oldAgentDir: string | undefined;

  afterEach(() => {
    vi.clearAllMocks();
    if (oldAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = oldAgentDir;
    if (cwd) rmSync(cwd, { recursive: true, force: true });
    if (agentDir) rmSync(agentDir, { recursive: true, force: true });
  });

  function makeTempDirs() {
    oldAgentDir = process.env.PI_CODING_AGENT_DIR;
    cwd = mkdtempSync(join(tmpdir(), "agent-scope-"));
    agentDir = mkdtempSync(join(tmpdir(), "agent-dir-"));
    process.env.PI_CODING_AGENT_DIR = agentDir;
  }

  it("registers list_scoped_models and returns JSON", async () => {
    makeTempDirs();
    writeSettings(cwd, ["anthropic/claude-sonnet-4-6:high"]);
    const { pi, tools } = makePi();
    subagentsExtension(pi);

    const result = await tools.get("list_scoped_models").execute("t1", {}, undefined, undefined, makeCtx(cwd));
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ source: "settings", hardBoundary: true, requiresExplicitModel: true });
    expect(parsed.models[0]).toMatchObject({ id: "anthropic/claude-sonnet-4-6", thinkingLevel: "high" });
  });

  it("rejects new sub-agent spawn without explicit model when scoped settings exist", async () => {
    makeTempDirs();
    writeSettings(cwd, ["anthropic/claude-sonnet-4-6"]);
    const { pi, tools } = makePi();
    subagentsExtension(pi);

    const result = await tools.get("Agent").execute("t1", {
      prompt: "x",
      description: "x",
      subagent_type: "general-purpose",
    }, undefined, undefined, makeCtx(cwd));

    expect(result.content[0].text).toContain("no model was selected");
    expect(runAgent).not.toHaveBeenCalled();
  });

  it("passes selected scoped model and scoped thinking to runAgent", async () => {
    makeTempDirs();
    writeSettings(cwd, ["anthropic/claude-sonnet-4-6:high"]);
    vi.mocked(runAgent).mockResolvedValue({
      responseText: "done",
      session: { dispose: vi.fn(), messages: [] } as any,
      aborted: false,
      steered: false,
    });
    const { pi, tools } = makePi();
    subagentsExtension(pi);

    await tools.get("Agent").execute("t1", {
      prompt: "x",
      description: "x",
      subagent_type: "general-purpose",
      model: "sonnet",
    }, undefined, undefined, makeCtx(cwd));

    expect(runAgent).toHaveBeenCalled();
    const options = vi.mocked(runAgent).mock.calls[0][3];
    expect(options.model).toBe(sonnet);
    expect(options.thinkingLevel).toBe("high");
  });

  it("rejects model outside scoped settings", async () => {
    makeTempDirs();
    writeSettings(cwd, ["anthropic/claude-sonnet-4-6"]);
    const { pi, tools } = makePi();
    subagentsExtension(pi);

    const result = await tools.get("Agent").execute("t1", {
      prompt: "x",
      description: "x",
      subagent_type: "general-purpose",
      model: "openai/gpt-4o",
    }, undefined, undefined, makeCtx(cwd));

    expect(result.content[0].text).toContain("outside the scoped model set");
    expect(runAgent).not.toHaveBeenCalled();
  });
});
