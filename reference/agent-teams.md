# Agent Teams — Master Reference Guide

> Source: https://code.claude.com/docs/en/agent-teams
> Requires: Claude Code v2.1.32 or later (`claude --version`)
> Status: **Experimental** — disabled by default

---

## 1. What Agent Teams Are

Agent Teams coordinate **multiple Claude Code instances** working together. One session is the **team lead**; the rest are **teammates**, each with its own context window. Unlike subagents, teammates can:

- Run independently in their own terminal/pane
- Talk **directly to each other** (not just to the lead)
- Share a **task list** and self-claim work
- Be messaged directly by the user without going through the lead

### Subagents vs Agent Teams

|                   | Subagents                                  | Agent Teams                                          |
| :---------------- | :----------------------------------------- | :--------------------------------------------------- |
| **Context**       | Own context; results return to caller      | Own context; fully independent                       |
| **Communication** | Report back to main agent only             | Teammates message each other directly                |
| **Coordination**  | Main agent manages all work                | Shared task list with self-coordination              |
| **Best for**      | Focused tasks where only the result matters| Complex work needing discussion + collaboration      |
| **Token cost**    | Lower (results summarized back)            | Higher (each teammate is a full Claude instance)     |

**Rule of thumb:** Subagents = "go fetch a result." Agent teams = "let's debate / build in parallel."

---

## 2. Enabling Agent Teams

Set the env var, either in shell or in `settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Restart Claude Code after enabling.

---

## 3. When to Use Them (and When Not To)

### Strong fits
- **Research & review** — multiple angles in parallel, then cross-challenge
- **New modules / features** — each teammate owns a separate piece
- **Debugging with competing hypotheses** — adversarial investigation
- **Cross-layer changes** — frontend / backend / tests, one teammate per layer

### Bad fits (use a single session or subagents)
- Sequential tasks with hard ordering
- Multiple teammates editing the **same file**
- Routine tasks where coordination overhead > benefit
- Tasks with many tight dependencies

---

## 4. Architecture

| Component     | Role                                                                         |
| :------------ | :--------------------------------------------------------------------------- |
| **Team lead** | Main session. Creates the team, spawns teammates, coordinates work.          |
| **Teammates** | Separate Claude Code instances assigned tasks.                               |
| **Task list** | Shared list. States: `pending`, `in_progress`, `completed`. Tasks can depend on others. |
| **Mailbox**   | Auto-delivered messaging between agents (no polling needed).                 |

### Storage paths (auto-managed — DO NOT hand-edit)
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list:   `~/.claude/tasks/{team-name}/`

The team config holds runtime state (session IDs, tmux pane IDs). Editing it gets overwritten on the next state update. There is **no** project-level `.claude/teams/teams.json` — it is not recognized.

The team config has a `members` array (name, agent ID, agent type). Teammates can read it to discover other members.

### Permissions
- Teammates inherit the **lead's permission mode** at spawn (including `--dangerously-skip-permissions`)
- After spawn, individual teammate modes can be changed
- You **cannot** set per-teammate modes at spawn time
- Teammate permission prompts bubble up to the lead → pre-approve common ops to reduce friction

### Context loaded at teammate spawn
- `CLAUDE.md` (from working directory)
- MCP servers (from project + user settings)
- Skills (from project + user settings)
- The spawn prompt from the lead
- **Not loaded:** the lead's conversation history

---

## 5. Starting a Team

You don't write a config. You **describe the team in natural language** and Claude builds it.

```text
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Create an agent team to explore this from different angles: one
teammate on UX, one on technical architecture, one playing devil's advocate.
```

Claude can also propose a team if it thinks the task warrants one — you confirm before it proceeds.

---

## 6. Display Modes

| Mode          | Behavior                                                           | Requires            |
| :------------ | :----------------------------------------------------------------- | :------------------ |
| **In-process**| All teammates inside main terminal. `Shift+Down` cycles teammates. | Nothing (any terminal) |
| **Split panes** | Each teammate gets its own pane                                  | tmux **or** iTerm2 + `it2` CLI |
| **auto** (default) | Split panes if already in tmux, else in-process              | —                   |

Set in `~/.claude/settings.json`:
```json
{ "teammateMode": "in-process" }
```

Or per-session flag:
```bash
claude --teammate-mode in-process
```

### In-process keybindings
- `Shift+Down` — cycle to next teammate (wraps back to lead after the last)
- `Enter` (on a teammate) — view their session
- `Escape` — interrupt teammate's current turn
- `Ctrl+T` — toggle the task list

### Split-pane setup
- **tmux**: install via system package manager. iTerm2 users → `tmux -CC` is the recommended entry.
- **iTerm2**: install [`it2`](https://github.com/mkusaka/it2), then enable Python API at *iTerm2 → Settings → General → Magic → Enable Python API*.
- **Not supported for split panes**: VS Code integrated terminal, Windows Terminal, Ghostty.

---

## 7. Controlling the Team (Prompt Patterns)

Everything is natural language to the lead. Useful patterns:

### Specify size + model
```text
Create a team with 4 teammates to refactor these modules in parallel.
Use Sonnet for each teammate.
```

### Require plan approval before edits
```text
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```
Teammate stays in read-only plan mode until lead approves; lead can reject with feedback ("only approve plans that include test coverage", etc.).

### Predictable teammate names
Tell the lead what to name each one in the spawn instruction so you can reference them later:
```text
Spawn three teammates named "ux", "arch", "devil".
```

### Direct messaging
- In-process: `Shift+Down` to a teammate, type, send
- Split-pane: click the teammate's pane

### Task assignment
- **Lead assigns**: "Give the security task to the reviewer teammate"
- **Self-claim**: teammate picks up next unblocked unassigned task on its own
- File-locked claim → no race conditions

### Shutdown one teammate
```text
Ask the researcher teammate to shut down
```
Teammate can approve (graceful exit) or reject with a reason.

### Clean up the team
```text
Clean up the team
```
**Always done by the lead.** Cleanup fails if any teammate is still running — shut them down first. Teammates must NOT run cleanup (their team context may not resolve right, leaving orphaned resources).

---

## 8. Reusing Subagent Definitions as Teammates

Reference a subagent type by name when spawning:
```text
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

What carries over from subagent definition:
- ✅ `tools` allowlist
- ✅ `model`
- ✅ Definition body — **appended** to the teammate system prompt (not replacing it)

What does NOT carry over (teammate uses project/user settings instead):
- ❌ `skills` frontmatter
- ❌ `mcpServers` frontmatter

Team coordination tools (`SendMessage`, task management) are **always available** even if `tools` restricts everything else.

---

## 9. Quality Gates via Hooks

Three hook events specific to teams (exit code 2 = block + send feedback):

| Hook              | When                                       | Code 2 effect                              |
| :---------------- | :----------------------------------------- | :----------------------------------------- |
| `TeammateIdle`    | Teammate is about to go idle               | Send feedback, keep teammate working       |
| `TaskCreated`     | Task is being created                      | Prevent creation, send feedback            |
| `TaskCompleted`   | Task is being marked complete              | Prevent completion, send feedback          |

Useful for: enforcing tests-must-pass before completion, blocking out-of-scope tasks, etc.

---

## 10. Token Cost Reality Check

- Each teammate = full context window = independent token bill
- Cost scales **linearly with active teammate count**
- Worth it for: research, review, new feature work, multi-hypothesis debugging
- Not worth it for: routine tasks, sequential work, single-file edits

See: `/en/costs#agent-team-token-costs`

---

## 11. Best Practices

### Sizing
- **3–5 teammates** for most workflows (start here)
- **5–6 tasks per teammate** keeps them busy without thrashing
- Three focused teammates often beat five scattered ones
- Scale up only if work genuinely parallelizes

### Task sizing
- Too small → coordination overhead exceeds benefit
- Too large → teammates work too long without check-ins
- **Just right**: self-contained unit with a clear deliverable (a function, a test file, a review doc)

### Spawn prompts: include task-specific context
Teammates don't inherit lead's history. Be explicit:
```text
Spawn a security reviewer teammate with the prompt: "Review the authentication module
at src/auth/ for security vulnerabilities. Focus on token handling, session
management, and input validation. The app uses JWT tokens stored in
httpOnly cookies. Report any issues with severity ratings."
```

### Avoid file conflicts
Partition work so each teammate owns a different set of files. Two teammates editing the same file → overwrites.

### Lead behavior
- If the lead starts implementing instead of delegating: `"Wait for your teammates to complete their tasks before proceeding"`
- If lead exits early: tell it to keep going
- Monitor and steer; don't let teams run unattended

### Start gentle
First-time team users: pick tasks with clear boundaries and **no code writing** — PR review, library research, bug investigation. Shows the value without the parallel-edit headaches.

---

## 12. Effective Team Recipes

### Parallel code review
```text
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```
**Why it works:** distinct lenses, no overlap, lead synthesizes at the end.

### Adversarial debugging
```text
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk to
each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```
**Why it works:** breaks anchoring bias. Surviving theory after cross-attack is far more likely to be the real cause.

### Cross-layer feature build
Pattern: one teammate per layer (frontend / backend / migrations / tests), each owning disjoint files. Lead coordinates the API contract.

### Module refactor in parallel
Pattern: each teammate owns one module. Pre-define the public-API contract in the spawn prompt so they don't drift.

---

## 13. Troubleshooting

| Symptom                              | Fix                                                                              |
| :----------------------------------- | :------------------------------------------------------------------------------- |
| Teammates not appearing              | `Shift+Down` to cycle (in-process); verify task is complex enough to warrant a team |
| Split panes won't open               | `which tmux` / verify iTerm2 `it2` CLI + Python API enabled                      |
| Too many permission prompts          | Pre-approve common ops in permission settings before spawning                    |
| Teammates stop on errors             | View their output (Shift+Down or click pane); give instructions or spawn replacement |
| Lead shuts down too early            | Tell it to keep going; tell it to wait for teammates before doing work itself    |
| Task stuck in progress               | Check if work is actually done; manually mark complete or nudge teammate via lead |
| Orphaned tmux session                | `tmux ls` then `tmux kill-session -t <name>`                                     |

---

## 14. Known Limitations (Experimental)

- **No session resumption with in-process teammates** — `/resume` and `/rewind` do not restore them. Lead may try to message ghosts; tell it to spawn new ones.
- **Task status can lag** — teammates sometimes don't mark tasks complete. Check + manually update.
- **Shutdown is slow** — teammates finish current request/tool call first
- **One team at a time** per lead — clean up before creating a new one
- **No nested teams** — teammates can't spawn teams or sub-teammates
- **Lead is fixed for the team's lifetime** — can't promote a teammate or transfer leadership
- **Permissions set at spawn** — can change after, but not per-teammate at spawn time
- **Split panes require tmux/iTerm2** — won't work in VS Code terminal, Windows Terminal, Ghostty

---

## 15. Quick-Reference Cheat Sheet

```text
# Spawn a team
"Create an agent team with N teammates to <task>. <role list>. <model>."

# Force plan approval
"Require plan approval before any changes."

# Use existing subagent type
"Spawn a teammate using the <agent-type> agent type to <task>."

# Direct message a teammate (in-process)
Shift+Down → cycle → type → send

# Toggle task list
Ctrl+T

# Shut down one teammate
"Ask the <name> teammate to shut down"

# Clean up team (always lead-side)
"Clean up the team"

# Force in-process for one session
claude --teammate-mode in-process
```

---

## 16. Decision Tree: Solo / Subagent / Team

```
Need parallel exploration with cross-talk?
├─ YES → AGENT TEAM
│        ├─ Research / review → 3 teammates, distinct lenses
│        ├─ Debugging unclear root cause → 4–5 teammates, adversarial
│        └─ Cross-layer build → 1 teammate per layer, partition files
│
└─ NO → Need parallel work but only results matter?
         ├─ YES → SUBAGENTS (cheaper, no coordination)
         └─ NO  → SINGLE SESSION
```

---

## 17. Related Docs (for future fetching)

- Subagents: `/en/sub-agents`
- Hooks: `/en/hooks` (esp. `TeammateIdle`, `TaskCreated`, `TaskCompleted`)
- Settings: `/en/settings` (`teammateMode`, env vars)
- Permissions: `/en/permissions`
- Costs: `/en/costs#agent-team-token-costs`
- Worktrees (manual parallelism alternative): `/en/worktrees`
- Interactive mode (task list UI): `/en/interactive-mode#task-list`
