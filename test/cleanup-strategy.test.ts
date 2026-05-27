import { beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeAgentRegistry } from "../src/runtime-agent-registry.js";
import type { AgentConfig } from "../src/types.js";

function createTestConfig(name: string): AgentConfig {
  return {
    name,
    description: `Test agent ${name}`,
    systemPrompt: `You are ${name}.`,
    promptMode: "replace",
    extensions: true,
    skills: true,
  };
}

describe("cleanup strategy", () => {
  let registry: RuntimeAgentRegistry;

  beforeEach(() => {
    registry = new RuntimeAgentRegistry();
  });

  describe("session-end cleanup", () => {
    it("clears all runtime agents", () => {
      registry.register(createTestConfig("agent-1"));
      registry.register(createTestConfig("agent-2"));
      registry.register(createTestConfig("agent-3"));

      registry.clearAll();

      expect(registry.list()).toEqual([]);
      expect(registry.has("agent-1")).toBe(false);
      expect(registry.has("agent-2")).toBe(false);
      expect(registry.has("agent-3")).toBe(false);
    });

    it("does not throw when registry is empty", () => {
      expect(() => registry.clearAll()).not.toThrow();
    });
  });

  describe("timeout cleanup", () => {
    it("clears stale agents", () => {
      registry.register(createTestConfig("old-agent"));
      registry.register(createTestConfig("new-agent"));

      // Make old-agent stale
      const oldRecord = registry.getRecord("old-agent");
      if (oldRecord) {
        oldRecord.lastUsedAt = Date.now() - 1000 * 60 * 60; // 1 hour ago
      }

      registry.clearStale(1000 * 60 * 30); // 30 min timeout

      expect(registry.has("old-agent")).toBe(false);
      expect(registry.has("new-agent")).toBe(true);
    });

    it("keeps agents within timeout", () => {
      registry.register(createTestConfig("recent-agent"));
      registry.clearStale(1000 * 60 * 30); // 30 min timeout
      expect(registry.has("recent-agent")).toBe(true);
    });

    it("clears multiple stale agents", () => {
      registry.register(createTestConfig("old-1"));
      registry.register(createTestConfig("old-2"));
      registry.register(createTestConfig("new"));

      // Make old agents stale
      const old1 = registry.getRecord("old-1");
      const old2 = registry.getRecord("old-2");
      if (old1) old1.lastUsedAt = Date.now() - 1000 * 60 * 60;
      if (old2) old2.lastUsedAt = Date.now() - 1000 * 60 * 60;

      registry.clearStale(1000 * 60 * 30);

      expect(registry.has("old-1")).toBe(false);
      expect(registry.has("old-2")).toBe(false);
      expect(registry.has("new")).toBe(true);
    });
  });

  describe("touch", () => {
    it("updates lastUsedAt on touch", () => {
      registry.register(createTestConfig("test-agent"));
      const before = registry.getRecord("test-agent")?.lastUsedAt ?? 0;

      // Small delay
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);
      registry.touch("test-agent");
      vi.useRealTimers();

      const after = registry.getRecord("test-agent")?.lastUsedAt ?? 0;
      expect(after).toBeGreaterThan(before);
    });

    it("touch keeps agent from being cleared", () => {
      registry.register(createTestConfig("test-agent"));

      // Make it stale
      const record = registry.getRecord("test-agent");
      if (record) record.lastUsedAt = Date.now() - 1000 * 60 * 60;

      // Touch it
      registry.touch("test-agent");

      // Should not be cleared
      registry.clearStale(1000 * 60 * 30);
      expect(registry.has("test-agent")).toBe(true);
    });
  });

  describe("integration with tool execution", () => {
    it("simulates tool execution clearing stale agents", () => {
      // Register agents
      registry.register(createTestConfig("old-agent"));
      registry.register(createTestConfig("active-agent"));

      // Simulate old agent not used for a while
      const oldRecord = registry.getRecord("old-agent");
      if (oldRecord) oldRecord.lastUsedAt = Date.now() - 1000 * 60 * 60;

      // Simulate active agent being used
      registry.touch("active-agent");

      // Simulate periodic cleanup (called on tool execution)
      registry.clearStale(1000 * 60 * 30);

      expect(registry.has("old-agent")).toBe(false);
      expect(registry.has("active-agent")).toBe(true);
    });
  });
});
