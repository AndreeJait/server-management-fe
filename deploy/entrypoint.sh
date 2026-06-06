#!/bin/sh
set -e

# Inject runtime environment variables into the Next.js app.
# NEXT_PUBLIC_ env vars are baked at build time, so we use a runtime
# injection script that writes window.__ENV before the app loads.

ENV_SCRIPT=/app/public/__env.js

echo "window.__ENV = {" > $ENV_SCRIPT
FIRST=true
for VAR in $(env | grep '^NEXT_PUBLIC_' | cut -d= -f1); do
  VALUE=$(eval echo "\$$VAR" | sed 's/"/\\"/g')
  if [ "$FIRST" = "true" ]; then
    FIRST=false
  else
    echo "," >> $ENV_SCRIPT
  fi
  printf '  "%s": "%s"' "$VAR" "$VALUE" >> $ENV_SCRIPT
done
echo "" >> $ENV_SCRIPT
echo "};" >> $ENV_SCRIPT

echo "[entrypoint] Injected runtime env vars: $(env | grep -c '^NEXT_PUBLIC_')"

exec "$@"