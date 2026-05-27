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

describe("RuntimeAgentRegistry", () => {
  let registry: RuntimeAgentRegistry;

  beforeEach(() => {
    registry = new RuntimeAgentRegistry();
  });

  describe("register", () => {
    it("registers a new agent", () => {
      const config = createTestConfig("test-agent");
      registry.register(config);
      expect(registry.has("test-agent")).toBe(true);
    });

    it("registers with case-insensitive name", () => {
      const config = createTestConfig("Test-Agent");
      registry.register(config);
      expect(registry.has("test-agent")).toBe(true);
      expect(registry.has("Test-Agent")).toBe(true);
      expect(registry.has("TEST-AGENT")).toBe(true);
    });

    it("throws on duplicate name", () => {
      const config = createTestConfig("test-agent");
      registry.register(config);
      expect(() => registry.register(config)).toThrow("already exists");
    });

    it("throws on case-insensitive duplicate", () => {
      registry.register(createTestConfig("test-agent"));
      expect(() => registry.register(createTestConfig("Test-Agent"))).toThrow("already exists");
    });
  });

  describe("unregister", () => {
    it("unregisters an agent", () => {
      registry.register(createTestConfig("test-agent"));
      registry.unregister("test-agent");
      expect(registry.has("test-agent")).toBe(false);
    });

    it("does not throw on unregistering non-existent agent", () => {
      expect(() => registry.unregister("non-existent")).not.toThrow();
    });
  });

  describe("has", () => {
    it("returns true for registered agent", () => {
      registry.register(createTestConfig("test-agent"));
      expect(registry.has("test-agent")).toBe(true);
    });

    it("returns false for non-existent agent", () => {
      expect(registry.has("non-existent")).toBe(false);
    });

    it("is case-insensitive", () => {
      registry.register(createTestConfig("test-agent"));
      expect(registry.has("Test-Agent")).toBe(true);
      expect(registry.has("TEST-AGENT")).toBe(true);
    });
  });

  describe("get", () => {
    it("returns config for registered agent", () => {
      const config = createTestConfig("test-agent");
      registry.register(config);
      expect(registry.get("test-agent")).toEqual(config);
    });

    it("returns undefined for non-existent agent", () => {
      expect(registry.get("non-existent")).toBeUndefined();
    });

    it("is case-insensitive", () => {
      const config = createTestConfig("test-agent");
      registry.register(config);
      expect(registry.get("Test-Agent")).toEqual(config);
    });
  });

  describe("list", () => {
    it("returns empty array when no agents", () => {
      expect(registry.list()).toEqual([]);
    });

    it("returns all registered agents", () => {
      registry.register(createTestConfig("agent-1"));
      registry.register(createTestConfig("agent-2"));
      const list = registry.list();
      expect(list).toHaveLength(2);
      expect(list.map(a => a.name)).toContain("agent-1");
      expect(list.map(a => a.name)).toContain("agent-2");
    });
  });

  describe("clearAll", () => {
    it("removes all agents", () => {
      registry.register(createTestConfig("agent-1"));
      registry.register(createTestConfig("agent-2"));
      registry.clearAll();
      expect(registry.list()).toEqual([]);
    });

    it("does not throw when empty", () => {
      expect(() => registry.clearAll()).not.toThrow();
    });
  });

  describe("clearStale", () => {
    it("clears agents older than timeout", () => {
      registry.register(createTestConfig("old-agent"));
      // Manually set lastUsedAt to past
      const record = registry.getRecord("old-agent");
      if (record) record.lastUsedAt = Date.now() - 1000 * 60 * 60; // 1 hour ago

      registry.register(createTestConfig("new-agent"));

      registry.clearStale(1000 * 60 * 30); // 30 min timeout
      expect(registry.has("old-agent")).toBe(false);
      expect(registry.has("new-agent")).toBe(true);
    });

    it("keeps agents within timeout", () => {
      registry.register(createTestConfig("recent-agent"));
      registry.clearStale(1000 * 60 * 30); // 30 min timeout
      expect(registry.has("recent-agent")).toBe(true);
    });
  });

  describe("touch", () => {
    it("updates lastUsedAt", () => {
      registry.register(createTestConfig("test-agent"));
      const before = registry.getRecord("test-agent")?.lastUsedAt ?? 0;
      // Small delay to ensure timestamp differs
      registry.touch("test-agent");
      const after = registry.getRecord("test-agent")?.lastUsedAt ?? 0;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });
});
