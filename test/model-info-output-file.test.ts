import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeInitialEntry } from "../src/output-file.js";

describe("writeInitialEntry with model info", () => {
  it("includes model and inherited fields when provided", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "test-"));
    const filePath = join(tempDir, "test.output");

    writeInitialEntry(filePath, "agent-123", "test prompt", "/tmp", "sonnet", true);

    const content = readFileSync(filePath, "utf-8");
    const entry = JSON.parse(content.trim());

    expect(entry.model).toBe("sonnet");
    expect(entry.inherited).toBe(true);
    expect(entry.agentId).toBe("agent-123");
    expect(entry.message.content).toBe("test prompt");
  });

  it("includes model but not inherited when inherited is false", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "test-"));
    const filePath = join(tempDir, "test.output");

    writeInitialEntry(filePath, "agent-123", "test prompt", "/tmp", "haiku", false);

    const content = readFileSync(filePath, "utf-8");
    const entry = JSON.parse(content.trim());

    expect(entry.model).toBe("haiku");
    expect(entry.inherited).toBe(false);
  });

  it("omits model and inherited when not provided", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "test-"));
    const filePath = join(tempDir, "test.output");

    writeInitialEntry(filePath, "agent-123", "test prompt", "/tmp");

    const content = readFileSync(filePath, "utf-8");
    const entry = JSON.parse(content.trim());

    expect(entry.model).toBeUndefined();
    expect(entry.inherited).toBeUndefined();
    expect(entry.agentId).toBe("agent-123");
  });

  it("omits model when modelName is undefined", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "test-"));
    const filePath = join(tempDir, "test.output");

    writeInitialEntry(filePath, "agent-123", "test prompt", "/tmp", undefined, true);

    const content = readFileSync(filePath, "utf-8");
    const entry = JSON.parse(content.trim());

    expect(entry.model).toBeUndefined();
    expect(entry.inherited).toBe(true);
  });
});
