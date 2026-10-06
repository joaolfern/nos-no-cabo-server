#!/bin/sh
# Manual moderation (staging): list | dismiss <id> | ban <id> [reason] | rebuild.
# The script lives in the private services/moderation submodule.
if [ ! -f services/moderation/package.json ]; then
  echo 'services/moderation is not checked out (private submodule).'
  exit 1
fi
exec pnpm --dir services/moderation run review:staging "$@"
