# Scoped model set bounds sub-agent model choice

Sub-agents must choose models within the parent session's scoped model set when one exists, even when an agent definition specifies a preferred model. This makes scoped models a user-controlled boundary for delegated work rather than merely a UI cycling list, trading away absolute agent-definition model locks in favor of predictable session-level model governance.

Agent definition `model` values are preferred defaults, not absolute locks. When no scoped model set exists, an explicitly requested model overrides the agent definition's preferred model; when a scoped model set exists, the caller must explicitly select a model from that set.
