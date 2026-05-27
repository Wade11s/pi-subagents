import { describe, expect, it } from "vitest";
import type { AgentInvocation } from "../src/types.js";
import { buildInvocationTags } from "../src/ui/agent-widget.js";

describe("Model info integration", () => {
  it("buildInvocationTags returns correct format for inherited model", () => {
    const invocation: AgentInvocation = {
      modelName: "sonnet",
      inherited: true,
      thinking: "high",
    };
    const result = buildInvocationTags(invocation);
    expect(result.modelName).toBe("sonnet (inherited)");
    expect(result.tags).toContain("thinking: high");
  });

  it("buildInvocationTags returns correct format for explicit model", () => {
    const invocation: AgentInvocation = {
      modelName: "haiku",
      inherited: false,
      isolated: true,
    };
    const result = buildInvocationTags(invocation);
    expect(result.modelName).toBe("haiku");
    expect(result.tags).toContain("isolated");
  });

  it("buildInvocationTags returns undefined modelName when not set", () => {
    const invocation: AgentInvocation = {
      thinking: "medium",
    };
    const result = buildInvocationTags(invocation);
    expect(result.modelName).toBeUndefined();
    expect(result.tags).toContain("thinking: medium");
  });
});
