import { beforeEach, describe, expect, it } from "vitest";
import { createAgentConfig, validateAgentConfig } from "../src/agent-config-validation.js";
import { RuntimeAgentRegistry } from "../src/runtime-agent-registry.js";

describe("create_agent tool logic", () => {
  let registry: RuntimeAgentRegistry;

  beforeEach(() => {
    registry = new RuntimeAgentRegistry();
  });

  describe("validation", () => {
    it("validates minimal valid config", () => {
      const params = {
        name: "test-agent",
        description: "Test agent",
        system_prompt: "You are a test agent.",
      };
      const result = validateAgentConfig(params);
      expect(result.valid).toBe(true);
    });

    it("rejects invalid name", () => {
      const params = {
        name: "invalid name",
        description: "Test agent",
        system_prompt: "You are a test agent.",
      };
      const result = validateAgentConfig(params);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("spaces");
    });

    it("rejects missing description", () => {
      const params = {
        name: "test-agent",
        system_prompt: "You are a test agent.",
      };
      const result = validateAgentConfig(params);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Description");
    });

    it("rejects invalid tools", () => {
      const params = {
        name: "test-agent",
        description: "Test agent",
        system_prompt: "You are a test agent.",
        tools: "read, invalid_tool",
      };
      const result = validateAgentConfig(params);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("invalid_tool");
    });
  });

  describe("registration", () => {
    it("registers agent after validation", () => {
      const params = {
        name: "test-agent",
        description: "Test agent",
        system_prompt: "You are a test agent.",
      };
      const validationResult = validateAgentConfig(params);
      expect(validationResult.valid).toBe(true);

      const config = createAgentConfig(params);
      registry.register(config);

      expect(registry.has("test-agent")).toBe(true);
      expect(registry.get("test-agent")?.description).toBe("Test agent");
    });

    it("rejects duplicate names", () => {
      const params = {
        name: "test-agent",
        description: "Test agent",
        system_prompt: "You are a test agent.",
      };
      const config = createAgentConfig(params);
      registry.register(config);

      expect(() => registry.register(config)).toThrow("already exists");
    });

    it("creates config with all params", () => {
      const params = {
        name: "full-agent",
        description: "Full agent",
        system_prompt: "You are a full agent.",
        tools: "read, bash",
        model: "anthropic/claude-haiku-4-5-20251001",
        thinking: "high",
        max_turns: 10,
        prompt_mode: "append",
        extensions: false,
        skills: false,
        disallowed_tools: "write, edit",
        inherit_context: true,
        run_in_background: true,
        isolated: true,
        memory: "project",
        isolation: "worktree",
      };
      const config = createAgentConfig(params);
      registry.register(config);

      const registered = registry.get("full-agent");
      expect(registered?.builtinToolNames).toEqual(["read", "bash"]);
      expect(registered?.model).toBe("anthropic/claude-haiku-4-5-20251001");
      expect(registered?.thinking).toBe("high");
      expect(registered?.maxTurns).toBe(10);
      expect(registered?.promptMode).toBe("append");
      expect(registered?.extensions).toBe(false);
      expect(registered?.skills).toBe(false);
      expect(registered?.disallowedTools).toEqual(["write", "edit"]);
      expect(registered?.inheritContext).toBe(true);
      expect(registered?.runInBackground).toBe(true);
      expect(registered?.isolated).toBe(true);
      expect(registered?.memory).toBe("project");
      expect(registered?.isolation).toBe("worktree");
    });
  });

  describe("response formatting", () => {
    it("formats success response", () => {
      const params = {
        name: "test-agent",
        description: "Test agent",
        system_prompt: "You are a test agent.",
        tools: "read, bash",
      };
      const config = createAgentConfig(params);
      registry.register(config);

      const response = [
        `Agent "${config.name}" created successfully.`,
        `Type: ${config.name}`,
        `Tools: ${config.builtinToolNames?.join(", ") ?? "all"}`,
        `Model: ${config.model ?? "inherited"}`,
        "",
        `Use Agent tool with subagent_type: "${config.name}" to invoke it.`,
      ].join("\n");

      expect(response).toContain("created successfully");
      expect(response).toContain("read, bash");
      expect(response).toContain("inherited");
    });
  });
});
