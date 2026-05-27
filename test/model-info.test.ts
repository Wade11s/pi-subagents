import { describe, expect, it } from "vitest";
import type { AgentInvocation } from "../src/types.js";
import { buildInvocationTags } from "../src/ui/agent-widget.js";

describe("buildInvocationTags with model info", () => {
  it("returns no modelName when invocation is undefined", () => {
    const result = buildInvocationTags(undefined);
    expect(result.modelName).toBeUndefined();
    expect(result.tags).toEqual([]);
  });

  it("returns no modelName when modelName is not set", () => {
    const invocation: AgentInvocation = {
      thinking: "high",
    };
    const result = buildInvocationTags(invocation);
    expect(result.modelName).toBeUndefined();
    expect(result.tags).toEqual(["thinking: high"]);
  });

  it("returns modelName without inherited suffix when inherited is false", () => {
    const invocation: AgentInvocation = {
      modelName: "sonnet",
      inherited: false,
    };
    const result = buildInvocationTags(invocation);
    expect(result.modelName).toBe("sonnet");
    expect(result.tags).toEqual([]);
  });

  it("returns modelName with inherited suffix when inherited is true", () => {
    const invocation: AgentInvocation = {
      modelName: "sonnet",
      inherited: true,
    };
    const result = buildInvocationTags(invocation);
    expect(result.modelName).toBe("sonnet (inherited)");
    expect(result.tags).toEqual([]);
  });

  it("returns modelName without inherited suffix when inherited is undefined", () => {
    const invocation: AgentInvocation = {
      modelName: "haiku",
    };
    const result = buildInvocationTags(invocation);
    expect(result.modelName).toBe("haiku");
    expect(result.tags).toEqual([]);
  });

  it("includes other tags alongside modelName", () => {
    const invocation: AgentInvocation = {
      modelName: "sonnet",
      inherited: true,
      thinking: "high",
      isolated: true,
    };
    const result = buildInvocationTags(invocation);
    expect(result.modelName).toBe("sonnet (inherited)");
    expect(result.tags).toEqual(["thinking: high", "isolated"]);
  });
});
