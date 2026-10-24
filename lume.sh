#!/usr/bin/env bash
# Foreground workspace commands. Use systemd/PM2 for managed processes.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
command="${1:-help}"
service="${2:-all}"
case "$service" in
  api|backend|be) package='@lume/api' ;;
  admin|frontend|fe) package='@lume/admin' ;;
  website|site) package='@lume/website' ;;
  all) package='' ;;
  *) echo "Unknown application: $service" >&2; exit 2 ;;
esac
case "$command" in
  install|setup) exec pnpm install --frozen-lockfile ;;
  start|dev) task=dev ;;
  build|typecheck|lint|test) task="$command" ;;
  help|-h|--help)
    echo 'Usage: ./lume.sh {install|dev|build|typecheck|lint|test} [api|admin|website|all]'
    echo 'Commands run in the foreground. Production API: lume-nestjs.service.'
    exit 0 ;;
  *) echo "Unknown command: $command. Run ./lume.sh help." >&2; exit 2 ;;
esac
if [[ -n "$package" ]]; then
  exec pnpm --filter "$package" "$task"
fi
exec pnpm run "$task"
