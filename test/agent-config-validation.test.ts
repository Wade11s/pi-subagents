import { describe, expect, it } from "vitest";
import {
  createAgentConfig,
  generateFrontmatter,
  validateAgentConfig,
  validateAgentName,
} from "../src/agent-config-validation.js";

describe("validateAgentName", () => {
  it("accepts valid names", () => {
    expect(validateAgentName("security-reviewer").valid).toBe(true);
    expect(validateAgentName("test-writer").valid).toBe(true);
    expect(validateAgentName("agent123").valid).toBe(true);
    expect(validateAgentName("my-agent").valid).toBe(true);
  });

  it("rejects empty names", () => {
    expect(validateAgentName("").valid).toBe(false);
    expect(validateAgentName("").error).toContain("required");
  });

  it("rejects names with spaces", () => {
    expect(validateAgentName("my agent").valid).toBe(false);
    expect(validateAgentName("my agent").error).toContain("spaces");
  });

  it("rejects names with special characters", () => {
    expect(validateAgentName("my_agent").valid).toBe(false);
    expect(validateAgentName("my@agent").valid).toBe(false);
    expect(validateAgentName("my.agent").valid).toBe(false);
  });

  it("rejects names starting with hyphen", () => {
    expect(validateAgentName("-agent").valid).toBe(false);
  });

  it("rejects names ending with hyphen", () => {
    expect(validateAgentName("agent-").valid).toBe(false);
  });
});

describe("validateAgentConfig", () => {
  const validParams = {
    name: "test-agent",
    description: "Test agent",
    system_prompt: "You are a test agent.",
  };

  it("accepts valid minimal config", () => {
    const result = validateAgentConfig(validParams);
    expect(result.valid).toBe(true);
  });

  it("rejects missing name", () => {
    const result = validateAgentConfig({ ...validParams, name: undefined });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Name");
  });

  it("rejects missing description", () => {
    const result = validateAgentConfig({ ...validParams, description: undefined });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Description");
  });

  it("rejects missing system_prompt", () => {
    const result = validateAgentConfig({ ...validParams, system_prompt: undefined });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("System prompt");
  });

  it("accepts valid tools", () => {
    const result = validateAgentConfig({ ...validParams, tools: "read, bash, grep" });
    expect(result.valid).toBe(true);
  });

  it("accepts 'all' for tools", () => {
    const result = validateAgentConfig({ ...validParams, tools: "all" });
    expect(result.valid).toBe(true);
  });

  it("accepts 'none' for tools", () => {
    const result = validateAgentConfig({ ...validParams, tools: "none" });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid tool names", () => {
    const result = validateAgentConfig({ ...validParams, tools: "read, invalid_tool" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("invalid_tool");
  });

  it("accepts valid thinking level", () => {
    const result = validateAgentConfig({ ...validParams, thinking: "high" });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid thinking level", () => {
    const result = validateAgentConfig({ ...validParams, thinking: "invalid" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("thinking");
  });

  it("accepts valid prompt_mode", () => {
    expect(validateAgentConfig({ ...validParams, prompt_mode: "replace" }).valid).toBe(true);
    expect(validateAgentConfig({ ...validParams, prompt_mode: "append" }).valid).toBe(true);
  });

  it("rejects invalid prompt_mode", () => {
    const result = validateAgentConfig({ ...validParams, prompt_mode: "invalid" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("prompt_mode");
  });

  it("accepts valid memory scope", () => {
    expect(validateAgentConfig({ ...validParams, memory: "user" }).valid).toBe(true);
    expect(validateAgentConfig({ ...validParams, memory: "project" }).valid).toBe(true);
    expect(validateAgentConfig({ ...validParams, memory: "local" }).valid).toBe(true);
  });

  it("rejects invalid memory scope", () => {
    const result = validateAgentConfig({ ...validParams, memory: "invalid" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("memory");
  });

  it("accepts valid isolation", () => {
    const result = validateAgentConfig({ ...validParams, isolation: "worktree" });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid isolation", () => {
    const result = validateAgentConfig({ ...validParams, isolation: "invalid" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("isolation");
  });
});

describe("createAgentConfig", () => {
  const validParams = {
    name: "test-agent",
    description: "Test agent",
    system_prompt: "You are a test agent.",
  };

  it("creates config with minimal params", () => {
    const config = createAgentConfig(validParams);
    expect(config.name).toBe("test-agent");
    expect(config.description).toBe("Test agent");
    expect(config.systemPrompt).toBe("You are a test agent.");
    expect(config.promptMode).toBe("replace");
  });

  it("creates config with all params", () => {
    const params = {
      ...validParams,
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

  it("parses tools string into array", () => {
    const config = createAgentConfig({ ...validParams, tools: "read, bash, grep" });
    expect(config.builtinToolNames).toEqual(["read", "bash", "grep"]);
  });

  it("handles 'all' tools", () => {
    const config = createAgentConfig({ ...validParams, tools: "all" });
    expect(config.builtinToolNames).toBeUndefined();
  });

  it("handles 'none' tools", () => {
    const config = createAgentConfig({ ...validParams, tools: "none" });
    expect(config.builtinToolNames).toEqual([]);
  });

  it("parses disallowed_tools string into array", () => {
    const config = createAgentConfig({ ...validParams, disallowed_tools: "write, edit" });
    expect(config.disallowedTools).toEqual(["write", "edit"]);
  });
});

describe("generateFrontmatter", () => {
  it("generates minimal frontmatter", () => {
    const config = {
      name: "test-agent",
      description: "Test agent",
      systemPrompt: "You are a test agent.",
      promptMode: "replace" as const,
      extensions: true as const,
      skills: true as const,
    };
    const frontmatter = generateFrontmatter(config);
    expect(frontmatter).toContain("description: Test agent");
    expect(frontmatter).toContain("prompt_mode: replace");
    expect(frontmatter).not.toContain("tools:");
    expect(frontmatter).not.toContain("model:");
  });

  it("generates full frontmatter", () => {
    const config = {
      name: "test-agent",
      description: "Test agent",
      builtinToolNames: ["read", "bash"],
      model: "anthropic/claude-haiku-4-5-20251001",
      thinking: "high" as const,
      maxTurns: 10,
      promptMode: "append" as const,
      extensions: false as const,
      skills: false as const,
      disallowedTools: ["write", "edit"],
      inheritContext: true,
      runInBackground: true,
      isolated: true,
      memory: "project" as const,
      isolation: "worktree" as const,
      systemPrompt: "You are a test agent.",
    };
    const frontmatter = generateFrontmatter(config);
    expect(frontmatter).toContain("description: Test agent");
    expect(frontmatter).toContain("tools: read, bash");
    expect(frontmatter).toContain("model: anthropic/claude-haiku-4-5-20251001");
    expect(frontmatter).toContain("thinking: high");
    expect(frontmatter).toContain("max_turns: 10");
    expect(frontmatter).toContain("prompt_mode: append");
    expect(frontmatter).toContain("extensions: false");
    expect(frontmatter).toContain("skills: false");
    expect(frontmatter).toContain("disallowed_tools: write, edit");
    expect(frontmatter).toContain("inherit_context: true");
    expect(frontmatter).toContain("run_in_background: true");
    expect(frontmatter).toContain("isolated: true");
    expect(frontmatter).toContain("memory: project");
    expect(frontmatter).toContain("isolation: worktree");
  });

  it("handles 'all' tools", () => {
    const config = {
      name: "test-agent",
      description: "Test agent",
      systemPrompt: "You are a test agent.",
      promptMode: "replace" as const,
      extensions: true as const,
      skills: true as const,
    };
    const frontmatter = generateFrontmatter(config);
    expect(frontmatter).not.toContain("tools:");
  });

  it("handles 'none' tools", () => {
    const config = {
      name: "test-agent",
      description: "Test agent",
      builtinToolNames: [],
      systemPrompt: "You are a test agent.",
      promptMode: "replace" as const,
      extensions: true as const,
      skills: true as const,
    };
    const frontmatter = generateFrontmatter(config);
    expect(frontmatter).toContain("tools: none");
  });
});
