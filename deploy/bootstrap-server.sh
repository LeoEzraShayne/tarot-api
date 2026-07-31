#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/tarot-api
ENV_FILE="$APP_DIR/.env"
DB_NAME=tarot
DB_USER=tarot_app
APP_PORT=4400

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo." >&2
  exit 1
fi

apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx postgresql-client git rsync
mkdir -p "$APP_DIR"
chown -R ubuntu:ubuntu "$APP_DIR"

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  DB_PASSWORD="$(openssl rand -base64 36 | tr -d '/+=')"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD'"
else
  if [[ -f $ENV_FILE ]]; then
    DB_PASSWORD="$(sed -n 's#^DATABASE_URL=postgres://tarot_app:\([^@]*\)@.*#\1#p' "$ENV_FILE")"
  else
    DB_PASSWORD="$(openssl rand -base64 36 | tr -d '/+=')"
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER ROLE $DB_USER PASSWORD '$DB_PASSWORD'"
  fi
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
fi

install -m 600 -o ubuntu -g ubuntu /dev/null "$ENV_FILE"
printf '%s\n' \
  'NODE_ENV=production' \
  'HOST=127.0.0.1' \
  "PORT=$APP_PORT" \
  'WEB_ORIGINS=https://tarot.meritledger.org,https://tarot-web-c5c.pages.dev' \
  "DATABASE_URL=postgres://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME" \
  'GOOGLE_CLIENT_ID=' > "$ENV_FILE"

install -m 755 "$APP_DIR/deploy/deploy-tarot-api" /usr/local/bin/deploy-tarot-api
install -m 644 "$APP_DIR/deploy/nginx-tarot-api.conf" /etc/nginx/sites-available/tarot-api
ln -sfn /etc/nginx/sites-available/tarot-api /etc/nginx/sites-enabled/tarot-api
nginx -t
systemctl reload nginx

cd "$APP_DIR"
sudo -u ubuntu npm ci --omit=dev
sudo -u ubuntu npm run migrate
sudo -u ubuntu pm2 startOrReload ecosystem.config.cjs --env production
sudo -u ubuntu pm2 save
curl --fail --silent http://127.0.0.1:4400/health
