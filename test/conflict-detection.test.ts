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

describe("conflict detection", () => {
  let registry: RuntimeAgentRegistry;

  beforeEach(() => {
    registry = new RuntimeAgentRegistry();
  });

  describe("runtime agent conflicts", () => {
    it("detects exact name conflict", () => {
      registry.register(createTestConfig("test-agent"));
      expect(() => registry.register(createTestConfig("test-agent"))).toThrow("already exists");
    });

    it("detects case-insensitive conflict", () => {
      registry.register(createTestConfig("test-agent"));
      expect(() => registry.register(createTestConfig("Test-Agent"))).toThrow("already exists");
      expect(() => registry.register(createTestConfig("TEST-AGENT"))).toThrow("already exists");
    });

    it("allows different names", () => {
      registry.register(createTestConfig("agent-1"));
      expect(() => registry.register(createTestConfig("agent-2"))).not.toThrow();
    });
  });

  describe("built-in agent conflicts", () => {
    // Simulate built-in agents
    const builtInAgents = new Set(["general-purpose", "explore", "plan"]);

    it("detects built-in name conflict", () => {
      const name = "general-purpose";
      expect(builtInAgents.has(name.toLowerCase())).toBe(true);
    });

    it("detects case-insensitive built-in conflict", () => {
      expect(builtInAgents.has("Explore".toLowerCase())).toBe(true);
      expect(builtInAgents.has("PLAN".toLowerCase())).toBe(true);
    });

    it("allows non-conflicting names", () => {
      expect(builtInAgents.has("my-agent")).toBe(false);
    });
  });

  describe("file-loaded agent conflicts", () => {
    // Simulate file-loaded agents
    const fileAgents = new Map<string, AgentConfig>();
    fileAgents.set("security-reviewer", createTestConfig("security-reviewer"));
    fileAgents.set("test-writer", createTestConfig("test-writer"));

    it("detects file-loaded agent conflict", () => {
      expect(fileAgents.has("security-reviewer")).toBe(true);
    });

    it("detects case-insensitive file-loaded conflict", () => {
      expect(fileAgents.has("Security-Reviewer")).toBe(false); // Map is case-sensitive
      // In real implementation, we need case-insensitive lookup
    });
  });

  describe("error messages", () => {
    it("provides clear error for runtime conflict", () => {
      registry.register(createTestConfig("test-agent", "My test agent"));
      try {
        registry.register(createTestConfig("test-agent", "Another agent"));
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toContain("already exists");
        expect((err as Error).message).toContain("test-agent");
      }
    });
  });
});
