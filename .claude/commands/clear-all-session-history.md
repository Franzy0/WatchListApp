---
description: Delete ALL of this project's local Claude Code data - transcripts, prompt history, memory, rewind snapshots, session files and stats
argument-hint: "[--dry-run] [--keep-memory] [--plans]"
allowed-tools: Bash(node:*)
disable-model-invocation: true
---

Project data purge has already run. Its output:

!`node "${CLAUDE_PROJECT_DIR}/.claude/scripts/clear-project-data.cjs" $ARGUMENTS`

Report the result to the user in two or three lines: what was deleted and how much,
plus anything the script says it spared, kept or could not delete. The purge is
scoped to this project only. Do not re-run the script and do not delete anything else.
