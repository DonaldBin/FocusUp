#!/usr/bin/env bash
set -euo pipefail
APP=/var/www/focusup
tar -xzf /tmp/focusup-deploy.tgz -C "$APP"
# Stale files removed locally must be deleted on server (tar does not prune).
rm -f "$APP/app/auth/callback/page.tsx" "$APP/app/auth/callback/page.js"
sed -i '1s/^\xEF\xBB\xBF//' /tmp/focusup.env.partial
cp /tmp/focusup.env.partial "$APP/.env.local"
cp /tmp/focusup.env.partial /etc/focusup.env
chmod 600 "$APP/.env.local" /etc/focusup.env
rm -f /tmp/focusup.env.partial
cd "$APP"
# Keep full install so next build tooling is present
npm ci
npm run build
pm2 restart focusup --update-env || pm2 start "$APP/ecosystem.config.cjs"
pm2 save
sleep 2
curl -sS -o /dev/null -w "local=%{http_code}\n" http://127.0.0.1:3003/login
grep APP_URL "$APP/.env.local"
echo REDEPLOY_OK
