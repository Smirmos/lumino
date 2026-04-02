#!/bin/bash
# PreToolUse hook: switch gh auth to Smirmos before git/gh commands
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only act on git push/pull/fetch/remote or gh commands
if echo "$COMMAND" | grep -qE '(git\s+(push|pull|fetch|remote|clone)|gh\s+(pr|issue|repo|release|run|api))'; then
  CURRENT=$(gh auth status 2>&1 | grep "Active account: true" -B3 | grep "account " | awk '{print $NF}' | tr -d '()')
  if [ "$CURRENT" != "Smirmos" ]; then
    gh auth switch --user Smirmos 2>/dev/null
  fi
fi

exit 0
