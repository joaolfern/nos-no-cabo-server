#!/bin/sh
# pnpm test:moderation                -> the moderation test suite
# pnpm test:moderation url=<url> ...  -> dry-run moderation of one site; nothing is stored or published
# The worker lives in the private services/moderation submodule.
if [ ! -f services/moderation/package.json ]; then
  echo 'services/moderation is not checked out (private submodule).'
  exit 0
fi
if [ $# -eq 0 ]; then
  exec pnpm --dir services/moderation test
fi
exec pnpm --dir services/moderation run check "$@"
