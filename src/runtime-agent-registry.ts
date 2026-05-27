/**
 * runtime-agent-registry.ts — In-memory registry for dynamically created agents.
 *
 * Manages runtime agents (created via create_agent tool) separately from
 * file-loaded agents. Provides conflict detection, cleanup scheduling,
 * and integration with the unified agent registry.
 */

import type { AgentConfig } from "./types.js";

/** A runtime agent record with metadata. */
export interface RuntimeAgentRecord {
  config: AgentConfig;
  createdAt: number;
  lastUsedAt: number;
}

/**
 * Case-insensitive key normalization.
 */
function normalizeKey(name: string): string {
  return name.toLowerCase();
}

/**
 * Registry for runtime (dynamically created) agents.
 */
export class RuntimeAgentRegistry {
  private agents = new Map<string, RuntimeAgentRecord>();

  /**
   * Register a runtime agent.
   * Throws if an agent with the same name (case-insensitive) already exists.
   */
  register(config: AgentConfig): void {
    const key = normalizeKey(config.name);
    if (this.agents.has(key)) {
      throw new Error(`Agent "${config.name}" already exists in runtime registry.`);
    }
    this.agents.set(key, {
      config,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });
  }

  /**
   * Unregister a runtime agent.
   * Does not throw if agent doesn't exist.
   */
  unregister(name: string): void {
    const key = normalizeKey(name);
    this.agents.delete(key);
  }

  /**
   * Check if a runtime agent exists (case-insensitive).
   */
  has(name: string): boolean {
    return this.agents.has(normalizeKey(name));
  }

  /**
   * Get runtime agent config (case-insensitive).
   * Returns undefined if not found.
   */
  get(name: string): AgentConfig | undefined {
    const key = normalizeKey(name);
    return this.agents.get(key)?.config;
  }

  /**
   * Get runtime agent record (case-insensitive).
   * Returns undefined if not found.
   */
  getRecord(name: string): RuntimeAgentRecord | undefined {
    const key = normalizeKey(name);
    return this.agents.get(key);
  }

  /**
   * List all runtime agents.
   */
  list(): AgentConfig[] {
    return [...this.agents.values()].map(r => r.config);
  }

  /**
   * Clear all runtime agents.
   */
  clearAll(): void {
    this.agents.clear();
  }

  /**
   * Clear stale agents older than timeout.
   * @param timeoutMs Timeout in milliseconds
   */
  clearStale(timeoutMs: number): void {
    const cutoff = Date.now() - timeoutMs;
    for (const [key, record] of this.agents) {
      if (record.lastUsedAt < cutoff) {
        this.agents.delete(key);
      }
    }
  }

  /**
   * Update lastUsedAt timestamp for an agent.
   */
  touch(name: string): void {
    const key = normalizeKey(name);
    const record = this.agents.get(key);
    if (record) {
      record.lastUsedAt = Date.now();
    }
  }
}
