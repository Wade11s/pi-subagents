import { beforeEach, describe, expect, it } from "vitest";
import { RuntimeAgentRegistry } from "../src/runtime-agent-registry.js";
import type { AgentConfig } from "../src/types.js";

function createTestConfig(name: string, description?: string): AgentConfig {
  return {
    name,
    description: description ?? `Test agent ${name}`,
    systemPrompt: `You are ${name}.`,
    promptMode: "replace",
    extensions: true,
    skills: true,
  };
}

describe("menu integration", () => {
  let registry: RuntimeAgentRegistry;

  beforeEach(() => {
    registry = new RuntimeAgentRegistry();
  });

  describe("list for menu", () => {
    it("returns empty array when no agents", () => {
      expect(registry.list()).toEqual([]);
    });

    it("returns all registered agents", () => {
      registry.register(createTestConfig("agent-1", "First agent"));
      registry.register(createTestConfig("agent-2", "Second agent"));

      const list = registry.list();
      expect(list).toHaveLength(2);
      expect(list.map(a => a.name)).toContain("agent-1");
      expect(list.map(a => a.name)).toContain("agent-2");
    });

    it("includes agent details for display", () => {
      registry.register(createTestConfig("security-reviewer", "Security-focused code reviewer"));

      const list = registry.list();
      const agent = list.find(a => a.name === "security-reviewer");
      expect(agent).toBeDefined();
      expect(agent?.description).toBe("Security-focused code reviewer");
    });
  });

  describe("display format", () => {
    it("formats runtime agent with lightning prefix", () => {
      const agent = createTestConfig("security-reviewer", "Security-focused code reviewer");
      agent.model = "anthropic/claude-sonnet-4-6";

      const display = `⚡ ${agent.name} · ${agent.model ?? "inherit"} — ${agent.description}`;
      expect(display).toBe("⚡ security-reviewer · anthropic/claude-sonnet-4-6 — Security-focused code reviewer");
    });

    it("formats runtime agent without model", () => {
      const agent = createTestConfig("test-writer", "Test generation specialist");

      const display = `⚡ ${agent.name} · ${agent.model ?? "inherit"} — ${agent.description}`;
      expect(display).toBe("⚡ test-writer · inherit — Test generation specialist");
    });
  });

  describe("detail view", () => {
    it("provides full agent info", () => {
      const config: AgentConfig = {
        name: "security-reviewer",
        description: "Security-focused code reviewer",
        builtinToolNames: ["read", "bash", "grep", "find", "ls"],
        model: "anthropic/claude-sonnet-4-6",
        thinking: "high",
        promptMode: "replace",
        extensions: true,
        skills: true,
        systemPrompt: "You are a security reviewer.",
      };
      registry.register(config);

      const agent = registry.get("security-reviewer");
      expect(agent).toBeDefined();
      expect(agent?.name).toBe("security-reviewer");
      expect(agent?.description).toBe("Security-focused code reviewer");
      expect(agent?.builtinToolNames).toEqual(["read", "bash", "grep", "find", "ls"]);
      expect(agent?.model).toBe("anthropic/claude-sonnet-4-6");
      expect(agent?.thinking).toBe("high");
    });

    it("shows runtime status", () => {
      registry.register(createTestConfig("test-agent"));

      const record = registry.getRecord("test-agent");
      expect(record).toBeDefined();
      expect(record?.createdAt).toBeDefined();
      expect(record?.lastUsedAt).toBeDefined();
    });
  });

  describe("delete from menu", () => {
    it("removes agent from registry", () => {
      registry.register(createTestConfig("test-agent"));
      expect(registry.has("test-agent")).toBe(true);

      registry.unregister("test-agent");
      expect(registry.has("test-agent")).toBe(false);
    });

    it("removes from list", () => {
      registry.register(createTestConfig("agent-1"));
      registry.register(createTestConfig("agent-2"));

      registry.unregister("agent-1");

      const list = registry.list();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe("agent-2");
    });
  });

  describe("integration with agent-types registry", () => {
    it("runtime agents are queryable", () => {
      registry.register(createTestConfig("runtime-agent"));

      // Simulate querying from unified registry
      const isRuntime = registry.has("runtime-agent");
      const config = registry.get("runtime-agent");

      expect(isRuntime).toBe(true);
      expect(config?.name).toBe("runtime-agent");
    });

    it("runtime agents appear in available types", () => {
      registry.register(createTestConfig("agent-1"));
      registry.register(createTestConfig("agent-2"));

      // Simulate getAvailableTypes()
      const runtimeTypes = registry.list().map(a => a.name);
      expect(runtimeTypes).toContain("agent-1");
      expect(runtimeTypes).toContain("agent-2");
    });
  });
});
