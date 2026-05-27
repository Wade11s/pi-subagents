import { describe, expect, it } from "vitest";
import type { AgentInvocation } from "../src/types.js";
import { buildInvocationTags } from "../src/ui/agent-widget.js";

describe("get_subagent_result model info", () => {
  it("buildInvocationTags returns model display name for inherited model", () => {
    const invocation: AgentInvocation = {
      modelName: "sonnet",
      inherited: true,
    };
    const { modelName } = buildInvocationTags(invocation);
    expect(modelName).toBe("sonnet (inherited)");
  });

  it("buildInvocationTags returns model display name for explicit model", () => {
    const invocation: AgentInvocation = {
      modelName: "haiku",
      inherited: false,
    };
    const { modelName } = buildInvocationTags(invocation);
    expect(modelName).toBe("haiku");
  });

  it("buildInvocationTags returns undefined when no model", () => {
    const invocation: AgentInvocation = {};
    const { modelName } = buildInvocationTags(invocation);
    expect(modelName).toBeUndefined();
  });

  it("stats parts include model when available", () => {
    const invocation: AgentInvocation = {
      modelName: "sonnet",
      inherited: true,
    };
    const { modelName } = buildInvocationTags(invocation);
    const statsParts = ["Tool uses: 3"];
    if (modelName) statsParts.push(`Model: ${modelName}`);
    statsParts.push("Duration: 5s");
    expect(statsParts.join(" | ")).toBe("Tool uses: 3 | Model: sonnet (inherited) | Duration: 5s");
  });

  it("stats parts omit model when not available", () => {
    const invocation: AgentInvocation = {};
    const { modelName } = buildInvocationTags(invocation);
    const statsParts = ["Tool uses: 3"];
    if (modelName) statsParts.push(`Model: ${modelName}`);
    statsParts.push("Duration: 5s");
    expect(statsParts.join(" | ")).toBe("Tool uses: 3 | Duration: 5s");
  });
});
