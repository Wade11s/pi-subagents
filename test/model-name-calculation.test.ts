import { describe, expect, it } from "vitest";

// Helper function that mimics the modelName calculation logic from index.ts
function calculateModelNameAndInherited(
  model: { id: string; name?: string } | undefined,
  parentModel: { id: string } | undefined,
): { modelName: string | undefined; inherited: boolean } {
  const parentModelId = parentModel?.id;
  const displayModel = model ?? parentModel;
  const effectiveModelId = displayModel?.id;
  const isInherited = !model || effectiveModelId === parentModelId;
  const modelName = effectiveModelId
    ? (displayModel?.name ?? effectiveModelId).replace(/^Claude\s+/i, "").toLowerCase()
    : undefined;
  return { modelName, inherited: isInherited };
}

describe("modelName calculation logic", () => {
  it("returns undefined modelName when no model is available", () => {
    const result = calculateModelNameAndInherited(undefined, undefined);
    expect(result.modelName).toBeUndefined();
    expect(result.inherited).toBe(true);
  });

  it("returns inherited model name when no explicit model is set", () => {
    const parentModel = { id: "claude-sonnet-4-6", name: "Claude Sonnet 4" };
    const result = calculateModelNameAndInherited(undefined, parentModel);
    expect(result.modelName).toBe("sonnet 4");
    expect(result.inherited).toBe(true);
  });

  it("returns explicit model name when model matches parent", () => {
    const model = { id: "claude-sonnet-4-6", name: "Claude Sonnet 4" };
    const parentModel = { id: "claude-sonnet-4-6", name: "Claude Sonnet 4" };
    const result = calculateModelNameAndInherited(model, parentModel);
    expect(result.modelName).toBe("sonnet 4");
    expect(result.inherited).toBe(true);
  });

  it("returns explicit model name when model differs from parent", () => {
    const model = { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" };
    const parentModel = { id: "claude-sonnet-4-6", name: "Claude Sonnet 4" };
    const result = calculateModelNameAndInherited(model, parentModel);
    expect(result.modelName).toBe("haiku 4.5");
    expect(result.inherited).toBe(false);
  });

  it("strips Claude prefix and lowercases model name", () => {
    const model = { id: "claude-opus-4-6", name: "Claude Opus 4" };
    const parentModel = { id: "claude-sonnet-4-6", name: "Claude Sonnet 4" };
    const result = calculateModelNameAndInherited(model, parentModel);
    expect(result.modelName).toBe("opus 4");
    expect(result.inherited).toBe(false);
  });

  it("uses model id when name is not available", () => {
    const model = { id: "gpt-4" };
    const parentModel = { id: "claude-sonnet-4-6" };
    const result = calculateModelNameAndInherited(model, parentModel);
    expect(result.modelName).toBe("gpt-4");
    expect(result.inherited).toBe(false);
  });
});
