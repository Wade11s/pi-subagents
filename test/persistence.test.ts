import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateFrontmatter } from "../src/agent-config-validation.js";
import type { AgentConfig } from "../src/types.js";

describe("persistence", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "test-persistence-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("generateFrontmatter", () => {
    it("generates minimal frontmatter", () => {
      const config: AgentConfig = {
        name: "test-agent",
        description: "Test agent",
        systemPrompt: "You are a test agent.",
        promptMode: "replace",
        extensions: true,
        skills: true,
      };
      const frontmatter = generateFrontmatter(config);
      expect(frontmatter).toContain("description: Test agent");
      expect(frontmatter).toContain("prompt_mode: replace");
      expect(frontmatter).not.toContain("tools:");
      expect(frontmatter).not.toContain("model:");
    });

    it("generates full frontmatter", () => {
      const config: AgentConfig = {
        name: "full-agent",
        description: "Full agent",
        builtinToolNames: ["read", "bash"],
        model: "anthropic/claude-haiku-4-5-20251001",
        thinking: "high",
        maxTurns: 10,
        promptMode: "append",
        extensions: false,
        skills: false,
        disallowedTools: ["write", "edit"],
        inheritContext: true,
        runInBackground: true,
        isolated: true,
        memory: "project",
        isolation: "worktree",
        systemPrompt: "You are a full agent.",
      };
      const frontmatter = generateFrontmatter(config);
      expect(frontmatter).toContain("description: Full agent");
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
  });

  describe("file writing", () => {
    it("writes agent file with correct format", () => {
      const config: AgentConfig = {
        name: "test-agent",
        description: "Test agent",
        builtinToolNames: ["read", "bash"],
        systemPrompt: "You are a test agent.",
        promptMode: "replace",
        extensions: true,
        skills: true,
      };
      const frontmatter = generateFrontmatter(config);
      const content = `---\n${frontmatter}\n---\n\n${config.systemPrompt}\n`;
      const filePath = join(tempDir, "test-agent.md");

      // Simulate file write
      const { writeFileSync } = require("node:fs");
      writeFileSync(filePath, content, "utf-8");

      expect(existsSync(filePath)).toBe(true);
      const saved = readFileSync(filePath, "utf-8");
      expect(saved).toContain("---");
      expect(saved).toContain("description: Test agent");
      expect(saved).toContain("tools: read, bash");
      expect(saved).toContain("You are a test agent.");
    });

    it("handles 'none' tools", () => {
      const config: AgentConfig = {
        name: "no-tools-agent",
        description: "No tools agent",
        builtinToolNames: [],
        systemPrompt: "You have no tools.",
        promptMode: "replace",
        extensions: true,
        skills: true,
      };
      const frontmatter = generateFrontmatter(config);
      expect(frontmatter).toContain("tools: none");
    });

    it("handles 'all' tools (omitted)", () => {
      const config: AgentConfig = {
        name: "all-tools-agent",
        description: "All tools agent",
        systemPrompt: "You have all tools.",
        promptMode: "replace",
        extensions: true,
        skills: true,
      };
      const frontmatter = generateFrontmatter(config);
      expect(frontmatter).not.toContain("tools:");
    });
  });
});
