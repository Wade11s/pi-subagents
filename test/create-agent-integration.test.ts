import { beforeEach, describe, expect, it } from "vitest";
import { createAgentConfig, validateAgentConfig } from "../src/agent-config-validation.js";
import { RuntimeAgentRegistry } from "../src/runtime-agent-registry.js";

describe("create_agent integration", () => {
  let runtimeRegistry: RuntimeAgentRegistry;

  beforeEach(() => {
    runtimeRegistry = new RuntimeAgentRegistry();
  });

  it("validates, creates, and registers agent", () => {
    const params = {
      name: "security-reviewer",
      description: "Security-focused code reviewer",
      system_prompt: "You are a security reviewer.",
      tools: "read, bash, grep, find, ls",
      model: "anthropic/claude-sonnet-4-6",
      thinking: "high",
    };

    // Validate
    const validation = validateAgentConfig(params);
    expect(validation.valid).toBe(true);

    // Create config
    const config = createAgentConfig(params);
    expect(config.name).toBe("security-reviewer");
    expect(config.builtinToolNames).toEqual(["read", "bash", "grep", "find", "ls"]);
    expect(config.model).toBe("anthropic/claude-sonnet-4-6");
    expect(config.thinking).toBe("high");

    // Register
    runtimeRegistry.register(config);
    expect(runtimeRegistry.has("security-reviewer")).toBe(true);
  });

  it("detects conflicts with existing runtime agents", () => {
    const params = {
      name: "test-agent",
      description: "Test agent",
      system_prompt: "You are a test agent.",
    };

    // Register first agent
    const config = createAgentConfig(params);
    runtimeRegistry.register(config);

    // Attempt to register duplicate
    expect(runtimeRegistry.has("test-agent")).toBe(true);
    expect(() => runtimeRegistry.register(config)).toThrow("already exists");
  });

  it("creates agent with minimal params", () => {
    const params = {
      name: "minimal-agent",
      description: "Minimal agent",
      system_prompt: "You are minimal.",
    };

    const validation = validateAgentConfig(params);
    expect(validation.valid).toBe(true);

    const config = createAgentConfig(params);
    expect(config.name).toBe("minimal-agent");
    expect(config.builtinToolNames).toBeUndefined(); // all tools
    expect(config.model).toBeUndefined(); // inherited
    expect(config.thinking).toBeUndefined(); // inherited
    expect(config.promptMode).toBe("replace");
    expect(config.extensions).toBe(true);
    expect(config.skills).toBe(true);
  });

  it("creates agent with all params", () => {
    const params = {
      name: "full-agent",
      description: "Full agent",
      system_prompt: "You are full.",
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

    const validation = validateAgentConfig(params);
    expect(validation.valid).toBe(true);

    const config = createAgentConfig(params);
    expect(config.builtinToolNames).toEqual(["read", "bash"]);
    expect(config.model).toBe("anthropic/claude-haiku-4-5-20251001");
    expect(config.thinking).toBe("high");
    expect(config.maxTurns).toBe(10);
    expect(config.promptMode).toBe("append");
    expect(config.extensions).toBe(false);
    expect(config.skills).toBe(false);
    expect(config.disallowedTools).toEqual(["write", "edit"]);
    expect(config.inheritContext).toBe(true);
    expect(config.runInBackground).toBe(true);
    expect(config.isolated).toBe(true);
    expect(config.memory).toBe("project");
    expect(config.isolation).toBe("worktree");
  });

  it("rejects invalid name", () => {
    const params = {
      name: "invalid name",
      description: "Test",
      system_prompt: "Test",
    };

    const validation = validateAgentConfig(params);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("spaces");
  });

  it("rejects invalid tools", () => {
    const params = {
      name: "test-agent",
      description: "Test",
      system_prompt: "Test",
      tools: "read, invalid_tool",
    };

    const validation = validateAgentConfig(params);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("invalid_tool");
  });

  it("rejects invalid thinking level", () => {
    const params = {
      name: "test-agent",
      description: "Test",
      system_prompt: "Test",
      thinking: "invalid",
    };

    const validation = validateAgentConfig(params);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("thinking");
  });

  it("formats success response", () => {
    const params = {
      name: "test-agent",
      description: "Test agent",
      system_prompt: "You are a test agent.",
      tools: "read, bash",
    };

    const config = createAgentConfig(params);
    runtimeRegistry.register(config);

    const tools = config.builtinToolNames?.join(", ") ?? "all";
    const model = config.model ?? "inherited";

    const response = [
      `Agent "${config.name}" created successfully.`,
      `Type: ${config.name}`,
      `Tools: ${tools}`,
      `Model: ${model}`,
      "",
      `Use Agent tool with subagent_type: "${config.name}" to invoke it.`,
    ].join("\n");

    expect(response).toContain("created successfully");
    expect(response).toContain("read, bash");
    expect(response).toContain("inherited");
  });
});
