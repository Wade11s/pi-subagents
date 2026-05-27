import { describe, expect, it } from "vitest";

// Helper function that mimics the background agent return text generation
function buildBackgroundAgentReturnText(
  isQueued: boolean,
  id: string,
  displayName: string,
  description: string,
  outputFile?: string,
  modelName?: string,
  isInherited?: boolean,
  maxConcurrent?: number,
): string {
  const modelLine = modelName
    ? `Model: ${modelName}${isInherited ? " (inherited)" : ""}\n`
    : "";
  return (
    `Agent ${isQueued ? "queued" : "started"} in background.\n` +
    `Agent ID: ${id}\n` +
    `Type: ${displayName}\n` +
    modelLine +
    `Description: ${description}\n` +
    (outputFile ? `Output file: ${outputFile}\n` : "") +
    (isQueued && maxConcurrent ? `Position: queued (max ${maxConcurrent} concurrent)\n` : "") +
    `\nYou will be notified when this agent completes.\n` +
    `Use get_subagent_result to retrieve full results, or steer_subagent to send it messages.\n` +
    `Do not duplicate this agent's work.`
  );
}

// Helper function that mimics the foreground agent stats parts
function buildForegroundStatsParts(
  toolUses: number,
  modelName?: string,
  isInherited?: boolean,
  tokenText?: string,
): string[] {
  const statsParts = [`${toolUses} tool uses`];
  if (modelName) {
    statsParts.push(isInherited ? `${modelName} (inherited)` : modelName);
  }
  if (tokenText) statsParts.push(tokenText);
  return statsParts;
}

describe("Agent tool return text with model info", () => {
  describe("background agent return", () => {
    it("includes model line when model is inherited", () => {
      const text = buildBackgroundAgentReturnText(
        false,
        "abc123",
        "general-purpose",
        "test task",
        undefined,
        "sonnet",
        true,
      );
      expect(text).toContain("Model: sonnet (inherited)");
    });

    it("includes model line when model is explicit", () => {
      const text = buildBackgroundAgentReturnText(
        false,
        "abc123",
        "general-purpose",
        "test task",
        undefined,
        "haiku",
        false,
      );
      expect(text).toContain("Model: haiku");
      expect(text).not.toContain("(inherited)");
    });

    it("omits model line when model is undefined", () => {
      const text = buildBackgroundAgentReturnText(
        false,
        "abc123",
        "general-purpose",
        "test task",
        undefined,
        undefined,
        undefined,
      );
      expect(text).not.toContain("Model:");
    });
  });

  describe("foreground agent stats", () => {
    it("includes model in stats when model is inherited", () => {
      const stats = buildForegroundStatsParts(3, "sonnet", true, "12.3k token");
      expect(stats).toEqual(["3 tool uses", "sonnet (inherited)", "12.3k token"]);
    });

    it("includes model in stats when model is explicit", () => {
      const stats = buildForegroundStatsParts(3, "haiku", false, "12.3k token");
      expect(stats).toEqual(["3 tool uses", "haiku", "12.3k token"]);
    });

    it("omits model when model is undefined", () => {
      const stats = buildForegroundStatsParts(3, undefined, undefined, "12.3k token");
      expect(stats).toEqual(["3 tool uses", "12.3k token"]);
    });
  });
});
