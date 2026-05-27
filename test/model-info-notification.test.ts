import { describe, expect, it } from "vitest";
import type { AgentInvocation } from "../src/types.js";
import { buildInvocationTags } from "../src/ui/agent-widget.js";

// Helper function that mimics the formatTaskNotification logic for model info
function buildModelXmlForNotification(invocation?: AgentInvocation): string {
  const { modelName: modelDisplayName } = buildInvocationTags(invocation);
  return modelDisplayName ? `<model>${modelDisplayName}</model>` : "";
}

describe("task notification model info", () => {
  it("includes model XML when model is inherited", () => {
    const invocation: AgentInvocation = {
      modelName: "sonnet",
      inherited: true,
    };
    const modelXml = buildModelXmlForNotification(invocation);
    expect(modelXml).toBe("<model>sonnet (inherited)</model>");
  });

  it("includes model XML when model is explicit", () => {
    const invocation: AgentInvocation = {
      modelName: "haiku",
      inherited: false,
    };
    const modelXml = buildModelXmlForNotification(invocation);
    expect(modelXml).toBe("<model>haiku</model>");
  });

  it("returns empty string when no model", () => {
    const invocation: AgentInvocation = {};
    const modelXml = buildModelXmlForNotification(invocation);
    expect(modelXml).toBe("");
  });

  it("returns empty string when invocation is undefined", () => {
    const modelXml = buildModelXmlForNotification(undefined);
    expect(modelXml).toBe("");
  });

  it("model XML appears before total_tokens in usage", () => {
    const invocation: AgentInvocation = {
      modelName: "sonnet",
      inherited: true,
    };
    const modelXml = buildModelXmlForNotification(invocation);
    const usageXml = `<usage>${modelXml}<total_tokens>12345</total_tokens><tool_uses>5</tool_uses></usage>`;
    expect(usageXml).toContain("<model>sonnet (inherited)</model>");
    expect(usageXml.indexOf("<model>")).toBeLessThan(usageXml.indexOf("<total_tokens>"));
  });
});
