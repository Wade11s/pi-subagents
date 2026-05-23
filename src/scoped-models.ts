import { getAgentDir, SettingsManager } from "@mariozechner/pi-coding-agent";
import { type ModelEntry, type ModelRegistry, resolveModel } from "./model-resolver.js";
import type { ThinkingLevel } from "./types.js";

export type ScopedModelSource = "active-session" | "settings" | "available-fallback";

export interface ScopedModelEntry {
  id: string;
  provider: string;
  modelId: string;
  name: string;
  thinkingLevel?: ThinkingLevel;
  model: any;
}

export interface ScopedModelListing {
  source: ScopedModelSource;
  hardBoundary: boolean;
  requiresExplicitModel: boolean;
  models: ScopedModelEntry[];
  guidance: string[];
  warnings: string[];
}

export interface ScopedModelContext {
  cwd?: string;
  modelRegistry: ModelRegistry;
}

const THINKING_LEVELS = new Set(["off", "minimal", "low", "medium", "high", "xhigh"]);

function canonicalId(model: ModelEntry): string {
  return `${model.provider}/${model.id}`;
}

function toEntry(model: any, thinkingLevel?: ThinkingLevel): ScopedModelEntry {
  const entry: ScopedModelEntry = {
    id: canonicalId(model),
    provider: model.provider,
    modelId: model.id,
    name: model.name,
    model,
  };
  if (thinkingLevel) entry.thinkingLevel = thinkingLevel;
  return entry;
}

function availableModels(registry: ModelRegistry): any[] {
  return (registry.getAvailable?.() ?? registry.getAll()) as any[];
}

function parsePattern(raw: string): { pattern: string; thinkingLevel?: ThinkingLevel } {
  const trimmed = raw.trim();
  const colon = trimmed.lastIndexOf(":");
  if (colon > 0) {
    const suffix = trimmed.slice(colon + 1);
    if (THINKING_LEVELS.has(suffix)) {
      return { pattern: trimmed.slice(0, colon), thinkingLevel: suffix as ThinkingLevel };
    }
  }
  return { pattern: trimmed };
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

function matchesPattern(model: any, pattern: string): boolean {
  const q = pattern.toLowerCase();
  const id = String(model.id).toLowerCase();
  const provider = String(model.provider).toLowerCase();
  const name = String(model.name ?? "").toLowerCase();
  const full = `${provider}/${id}`;

  if (pattern.includes("*")) {
    const re = globToRegex(pattern);
    return re.test(full) || re.test(id) || re.test(name) || re.test(provider);
  }

  return q === full || q === id || q === name;
}

function makeScopedRegistry(models: any[]): ModelRegistry {
  return {
    find(provider: string, modelId: string) {
      return models.find(m => m.provider === provider && m.id === modelId);
    },
    getAll() {
      return models;
    },
    getAvailable() {
      return models;
    },
  };
}

function resolvePattern(pattern: string, registry: ModelRegistry): any[] {
  const all = availableModels(registry);
  if (!pattern) return [];
  if (pattern === "*") return all;

  const directMatches = all.filter(model => matchesPattern(model, pattern));
  if (directMatches.length > 0) return directMatches;

  const fuzzy = resolveModel(pattern, registry);
  return typeof fuzzy === "string" ? [] : [fuzzy];
}

function readSavedPatterns(ctx: ScopedModelContext): string[] | undefined {
  const settingsManager = SettingsManager.create(ctx.cwd ?? process.cwd(), getAgentDir());
  return settingsManager.getEnabledModels();
}

export function getScopedModelListing(ctx: ScopedModelContext): ScopedModelListing {
  const patterns = readSavedPatterns(ctx);
  const warnings: string[] = [];

  if (patterns && patterns.length > 0) {
    const entries: ScopedModelEntry[] = [];
    const seen = new Set<string>();

    for (const raw of patterns) {
      const { pattern, thinkingLevel } = parsePattern(raw);
      const matches = resolvePattern(pattern, ctx.modelRegistry);
      if (matches.length === 0) {
        warnings.push(`Scoped model pattern did not match an available model: ${raw}`);
      }
      for (const model of matches) {
        const id = canonicalId(model);
        if (seen.has(id)) continue;
        seen.add(id);
        entries.push(toEntry(model, thinkingLevel));
      }
    }

    if (entries.length === 0) {
      warnings.push("A saved scoped model set is configured, but it resolved to no available models. Update /scoped-models or model credentials.");
    }

    return {
      source: "settings",
      hardBoundary: true,
      requiresExplicitModel: true,
      models: entries,
      guidance: buildGuidance(true),
      warnings,
    };
  }

  const fallbackModels = availableModels(ctx.modelRegistry).map(model => toEntry(model));
  if (fallbackModels.length === 0) warnings.push("No available models found. Configure model credentials before spawning sub-agents.");

  return {
    source: "available-fallback",
    hardBoundary: false,
    requiresExplicitModel: false,
    models: fallbackModels,
    guidance: buildGuidance(false),
    warnings,
  };
}

function buildGuidance(hardBoundary: boolean): string[] {
  return [
    hardBoundary
      ? "A scoped model set is configured; call Agent with model set to one models[].id from this listing. Do not use models outside this list."
      : "No scoped model set is configured; this is an available-model fallback, not a hard model boundary. Agent.model is optional.",
    "If the user requested a specific model, choose it only if it appears in models[].id (or fuzzy-matches an entry in this list).",
    "If the user did not request a model, choose the most appropriate listed model for the sub-agent task: prefer stronger models for broad planning, code edits, or ambiguous tasks; prefer faster/cheaper models for narrow read-only exploration.",
    "If the chosen entry has thinkingLevel, Agent will use it unless Agent.thinking explicitly overrides it.",
    "Active session-only scoped models may not be visible to this extension yet; saved scoped-model settings are used when present.",
  ];
}

export function serializeScopedModelListing(listing: ScopedModelListing): string {
  return JSON.stringify({
    source: listing.source,
    hardBoundary: listing.hardBoundary,
    requiresExplicitModel: listing.requiresExplicitModel,
    models: listing.models.map(({ model: _model, ...rest }) => rest),
    guidance: listing.guidance,
    warnings: listing.warnings,
  }, null, 2);
}

export function resolveModelWithinScopedListing(input: string, listing: ScopedModelListing): { model: any; entry: ScopedModelEntry } | string {
  const scopedRegistry = makeScopedRegistry(listing.models.map(entry => entry.model));
  const resolved = resolveModel(input, scopedRegistry);
  if (typeof resolved === "string") return formatScopedModelError(input, listing);
  const entry = listing.models.find(e => e.provider === resolved.provider && e.modelId === resolved.id);
  if (!entry) return formatScopedModelError(input, listing);
  return { model: resolved, entry };
}

export function formatScopedModelError(input: string | undefined, listing: ScopedModelListing): string {
  const available = listing.models.slice(0, 20).map(entry => `  ${entry.id}`).join("\n");
  const more = listing.models.length > 20 ? `\n  ... (${listing.models.length - 20} more; call list_scoped_models for the full list)` : "";
  const requested = input ? `Requested model "${input}" is outside the scoped model set.` : "A scoped model set is configured, but no model was selected.";
  return `${requested}\n\nCall list_scoped_models and pass one models[].id as Agent.model.\n\nScoped models:\n${available || "  (none — update /scoped-models or model credentials)"}${more}`;
}

export interface SubagentModelSelectionInput {
  modelParam?: string;
  configModel?: string;
  thinkingParam?: ThinkingLevel;
  configThinking?: ThinkingLevel;
  requireExplicitModel: boolean;
}

export interface SubagentModelSelection {
  model?: any;
  thinking?: ThinkingLevel;
  modelInput?: string;
  modelFromParams: boolean;
  scopedListing: ScopedModelListing;
  scopedEntry?: ScopedModelEntry;
}

export function resolveSubagentModelSelection(
  ctx: ScopedModelContext,
  input: SubagentModelSelectionInput,
): SubagentModelSelection | string {
  const scopedListing = getScopedModelListing(ctx);

  if (scopedListing.hardBoundary) {
    if (input.requireExplicitModel && !input.modelParam) return formatScopedModelError(undefined, scopedListing);
    if (!input.modelParam) {
      return {
        modelFromParams: false,
        thinking: input.thinkingParam ?? input.configThinking,
        scopedListing,
      };
    }
    const resolved = resolveModelWithinScopedListing(input.modelParam, scopedListing);
    if (typeof resolved === "string") return resolved;
    return {
      model: resolved.model,
      thinking: input.thinkingParam ?? resolved.entry.thinkingLevel ?? input.configThinking,
      modelInput: input.modelParam,
      modelFromParams: true,
      scopedListing,
      scopedEntry: resolved.entry,
    };
  }

  const modelInput = input.modelParam ?? input.configModel;
  let model: any | undefined;
  if (modelInput) {
    const resolved = resolveModel(modelInput, ctx.modelRegistry);
    if (typeof resolved === "string") {
      if (input.modelParam) return resolved;
    } else {
      model = resolved;
    }
  }

  return {
    model,
    thinking: input.thinkingParam ?? input.configThinking,
    modelInput,
    modelFromParams: input.modelParam != null,
    scopedListing,
  };
}

export function canonicalModelId(model: any): string | undefined {
  return model?.provider && model?.id ? `${model.provider}/${model.id}` : undefined;
}
