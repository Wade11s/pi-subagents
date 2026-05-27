/**
 * agent-config-validation.ts — Shared validation logic for agent configurations.
 *
 * Provides reusable functions for validating and creating agent configurations,
 * used by both create_agent tool and /agents manual wizard.
 */

import { BUILTIN_TOOL_NAMES } from "./agent-types.js";
import type { AgentConfig, IsolationMode, MemoryScope, ThinkingLevel } from "./types.js";

/** Valid thinking levels. */
const VALID_THINKING_LEVELS = new Set<ThinkingLevel>([
  "off", "minimal", "low", "medium", "high", "xhigh",
]);

/** Valid memory scopes. */
const VALID_MEMORY_SCOPES = new Set<MemoryScope>(["user", "project", "local"]);

/** Valid isolation modes. */
const VALID_ISOLATION_MODES = new Set<IsolationMode>(["worktree"]);

/** Valid prompt modes. */
const VALID_PROMPT_MODES = new Set(["replace", "append"]);

/** Name format: alphanumeric + hyphens, no spaces, no leading/trailing hyphens. */
const NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/i;

/** Validation result. */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Parameters for creating an agent config. */
export interface AgentConfigParams {
  name?: unknown;
  description?: unknown;
  system_prompt?: unknown;
  tools?: unknown;
  model?: unknown;
  thinking?: unknown;
  max_turns?: unknown;
  prompt_mode?: unknown;
  extensions?: unknown;
  skills?: unknown;
  disallowed_tools?: unknown;
  inherit_context?: unknown;
  run_in_background?: unknown;
  isolated?: unknown;
  memory?: unknown;
  isolation?: unknown;
}

/**
 * Validate agent name format.
 * Rules: alphanumeric + hyphens, no spaces, no leading/trailing hyphens.
 */
export function validateAgentName(name: unknown): ValidationResult {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Name is required." };
  }
  if (name.includes(" ")) {
    return { valid: false, error: "Name cannot contain spaces." };
  }
  if (!NAME_REGEX.test(name)) {
    return { valid: false, error: "Name must be alphanumeric with hyphens only, no leading/trailing hyphens." };
  }
  return { valid: true };
}

/**
 * Parse comma-separated string into array, handling "all" and "none".
 */
function parseToolsString(tools: unknown): string[] | undefined {
  if (tools === undefined || tools === null) return undefined;
  if (typeof tools !== "string") return undefined;
  const trimmed = tools.trim();
  if (trimmed === "all") return undefined; // undefined means all tools
  if (trimmed === "none") return [];
  return trimmed.split(",").map(t => t.trim()).filter(Boolean);
}

/**
 * Parse comma-separated string into array.
 */
function parseCsvString(val: unknown): string[] | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  if (!trimmed || trimmed === "none") return undefined;
  return trimmed.split(",").map(t => t.trim()).filter(Boolean);
}

/**
 * Parse boolean or string value.
 */
function parseBoolean(val: unknown): boolean | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const trimmed = val.trim().toLowerCase();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
  }
  return undefined;
}

/**
 * Parse extensions/skills field: boolean, "true", "false", or comma-separated.
 */
function parseInheritField(val: unknown): true | string[] | false | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const trimmed = val.trim().toLowerCase();
    if (trimmed === "true") return true;
    if (trimmed === "false" || trimmed === "none") return false;
    const items = trimmed.split(",").map(t => t.trim()).filter(Boolean);
    return items.length > 0 ? items : false;
  }
  return undefined;
}

/**
 * Validate agent configuration parameters.
 * Returns detailed error message if invalid.
 */
export function validateAgentConfig(params: unknown): ValidationResult {
  if (!params || typeof params !== "object") {
    return { valid: false, error: "Parameters must be an object." };
  }

  const p = params as Record<string, unknown>;

  // Validate name
  const nameResult = validateAgentName(p.name);
  if (!nameResult.valid) return nameResult;

  // Validate description
  if (!p.description || typeof p.description !== "string") {
    return { valid: false, error: "Description is required." };
  }

  // Validate system_prompt
  if (!p.system_prompt || typeof p.system_prompt !== "string") {
    return { valid: false, error: "System prompt is required." };
  }

  // Validate tools
  if (p.tools !== undefined) {
    const tools = parseToolsString(p.tools);
    if (tools !== undefined) {
      for (const tool of tools) {
        if (!BUILTIN_TOOL_NAMES.includes(tool)) {
          return { valid: false, error: `Invalid tool name: "${tool}". Valid tools: ${BUILTIN_TOOL_NAMES.join(", ")}` };
        }
      }
    }
  }

  // Validate thinking
  if (p.thinking !== undefined && p.thinking !== null) {
    if (typeof p.thinking !== "string" || !VALID_THINKING_LEVELS.has(p.thinking as ThinkingLevel)) {
      return { valid: false, error: `Invalid thinking level: "${p.thinking}". Valid levels: ${[...VALID_THINKING_LEVELS].join(", ")}` };
    }
  }

  // Validate prompt_mode
  if (p.prompt_mode !== undefined && p.prompt_mode !== null) {
    if (typeof p.prompt_mode !== "string" || !VALID_PROMPT_MODES.has(p.prompt_mode)) {
      return { valid: false, error: `Invalid prompt_mode: "${p.prompt_mode}". Valid modes: replace, append` };
    }
  }

  // Validate max_turns
  if (p.max_turns !== undefined && p.max_turns !== null) {
    if (typeof p.max_turns !== "number" || p.max_turns < 0) {
      return { valid: false, error: "max_turns must be a non-negative number." };
    }
  }

  // Validate memory
  if (p.memory !== undefined && p.memory !== null) {
    if (typeof p.memory !== "string" || !VALID_MEMORY_SCOPES.has(p.memory as MemoryScope)) {
      return { valid: false, error: `Invalid memory scope: "${p.memory}". Valid scopes: ${[...VALID_MEMORY_SCOPES].join(", ")}` };
    }
  }

  // Validate isolation
  if (p.isolation !== undefined && p.isolation !== null) {
    if (typeof p.isolation !== "string" || !VALID_ISOLATION_MODES.has(p.isolation as IsolationMode)) {
      return { valid: false, error: `Invalid isolation mode: "${p.isolation}". Valid modes: ${[...VALID_ISOLATION_MODES].join(", ")}` };
    }
  }

  // Validate disallowed_tools
  if (p.disallowed_tools !== undefined && p.disallowed_tools !== null) {
    const tools = parseCsvString(p.disallowed_tools);
    if (tools) {
      for (const tool of tools) {
        if (!BUILTIN_TOOL_NAMES.includes(tool)) {
          return { valid: false, error: `Invalid disallowed tool name: "${tool}". Valid tools: ${BUILTIN_TOOL_NAMES.join(", ")}` };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Create AgentConfig from validated parameters.
 */
export function createAgentConfig(params: AgentConfigParams): AgentConfig {
  const tools = parseToolsString(params.tools);
  const disallowedTools = parseCsvString(params.disallowed_tools);
  const extensions = parseInheritField(params.extensions) ?? true;
  const skills = parseInheritField(params.skills) ?? true;

  return {
    name: String(params.name),
    description: String(params.description),
    builtinToolNames: tools,
    disallowedTools,
    extensions,
    skills,
    model: typeof params.model === "string" ? params.model : undefined,
    thinking: params.thinking as ThinkingLevel | undefined,
    maxTurns: typeof params.max_turns === "number" ? params.max_turns : undefined,
    systemPrompt: String(params.system_prompt),
    promptMode: (params.prompt_mode as "replace" | "append") ?? "replace",
    inheritContext: parseBoolean(params.inherit_context),
    runInBackground: parseBoolean(params.run_in_background),
    isolated: parseBoolean(params.isolated),
    memory: params.memory as MemoryScope | undefined,
    isolation: params.isolation as IsolationMode | undefined,
  };
}

/**
 * Generate frontmatter for .md file from AgentConfig.
 */
export function generateFrontmatter(config: AgentConfig): string {
  const lines: string[] = [];

  lines.push(`description: ${config.description}`);
  if (config.displayName) lines.push(`display_name: ${config.displayName}`);

  // Tools: undefined = all, [] = none, [...] = listed
  if (config.builtinToolNames === undefined) {
    // all tools — omit field
  } else if (config.builtinToolNames.length === 0) {
    lines.push("tools: none");
  } else {
    lines.push(`tools: ${config.builtinToolNames.join(", ")}`);
  }

  if (config.model) lines.push(`model: ${config.model}`);
  if (config.thinking) lines.push(`thinking: ${config.thinking}`);
  if (config.maxTurns !== undefined) lines.push(`max_turns: ${config.maxTurns}`);
  lines.push(`prompt_mode: ${config.promptMode}`);

  if (config.extensions === false) lines.push("extensions: false");
  else if (Array.isArray(config.extensions)) lines.push(`extensions: ${config.extensions.join(", ")}`);

  if (config.skills === false) lines.push("skills: false");
  else if (Array.isArray(config.skills)) lines.push(`skills: ${config.skills.join(", ")}`);

  if (config.disallowedTools?.length) lines.push(`disallowed_tools: ${config.disallowedTools.join(", ")}`);
  if (config.inheritContext) lines.push("inherit_context: true");
  if (config.runInBackground) lines.push("run_in_background: true");
  if (config.isolated) lines.push("isolated: true");
  if (config.memory) lines.push(`memory: ${config.memory}`);
  if (config.isolation) lines.push(`isolation: ${config.isolation}`);

  return lines.join("\n");
}
