#!/bin/bash
# PostToolUse hook: switch gh auth back to arkadiy-sm after git/gh commands
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only act on git push/pull/fetch/remote or gh commands
if echo "$COMMAND" | grep -qE '(git\s+(push|pull|fetch|clone|remote)|gh\s+(pr|issue|repo|release|run|api))'; then
  CURRENT=$(gh auth status 2>&1 | grep "Active account: true" -B3 | grep "account " | awk '{print $NF}' | tr -d '()')
  if [ "$CURRENT" != "arkadiy-sm" ]; then
    gh auth switch --user arkadiy-sm 2>/dev/null
  fi
fi

exit 0
