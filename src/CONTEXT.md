# Core Sub-agent Runtime

This context defines the language for launching and managing sub-agents from a parent pi session.

## Language

**Sub-agent**:
An autonomous agent spawned by a parent agent to handle a delegated task in its own conversation. A sub-agent may run foreground or background, but it remains accountable to the parent conversation.
_Avoid_: child agent, worker, task agent

**Scoped model set**:
The ordered set of models the parent session permits for quick switching and delegated model selection. It is a hard boundary for sub-agent model choice: sub-agents choose within it rather than escaping to broader available models when a scoped set exists.
_Avoid_: available models, model registry, all models

**Available model**:
A model that pi can currently use because it is known and has usable credentials. Availability is broader than the scoped model set.
_Avoid_: scoped model, enabled model

**Delegated model selection**:
The choice of which scoped model a sub-agent should use for a delegated task. The user's prompt may request a specific scoped model; otherwise the parent agent chooses the most appropriate scoped model for the sub-agent task. When a scoped model set exists, spawning a new sub-agent without a selected model is rejected; a requested model outside the scoped model set is rejected rather than silently rewritten. When no scoped model set exists, an explicitly requested model overrides an agent definition's preferred model. Thinking priority is explicit request, then scoped model entry, then agent definition default.
_Avoid_: automatic model routing, provider selection

**Scoped model source**:
The place from which a scoped model set was read. Active session scope is preferred; saved settings scope is an explicit fallback when the active session scope is not exposed to the extension.
_Avoid_: model provider, registry source

**Scoped model listing**:
A structured report of scoped models exposed to the parent agent for delegated model selection. It includes the source, whether the list is a hard boundary, whether sub-agent creation requires an explicit model, canonical model identifiers, display names, optional thinking levels, and guidance for choosing among them. When no scoped model set exists, the listing may fall back to available models and must label that source explicitly; sub-agents do not inherit this listing tool because model choice happens before they are created.
_Avoid_: model registry dump, provider list

## Example dialogue

Dev: “Should this sub-agent use any available model?”
Domain expert: “No. It should choose from the scoped model set first, because that represents the parent session’s intended model choices.”
Dev: “What if the active session scope cannot be read?”
Domain expert: “Use the saved scoped model set, then fall back to available models only when no scoped model set is available.”
