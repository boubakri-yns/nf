#!/bin/sh
set -eu

cd /var/www

set_env_value() {
  key="$1"
  value="$2"

  if grep -q "^${key}=" .env; then
    sed -i "s#^${key}=.*#${key}=${value}#" .env
  else
    printf '\n%s=%s\n' "$key" "$value" >> .env
  fi
}

if [ ! -f .env ]; then
  cp .env.example .env
fi

set_env_value "DB_CONNECTION" "${DB_CONNECTION:-mysql}"
set_env_value "DB_HOST" "${DB_HOST:-mysql}"
set_env_value "DB_PORT" "${DB_PORT:-3306}"
set_env_value "DB_DATABASE" "${DB_DATABASE:-gnf_expenses}"
set_env_value "DB_USERNAME" "${DB_USERNAME:-gnf}"
set_env_value "DB_PASSWORD" "${DB_PASSWORD:-gnf}"
set_env_value "APP_URL" "${APP_URL:-http://localhost:8001}"
set_env_value "LOG_CHANNEL" "stderr"

if [ ! -f vendor/autoload.php ]; then
  composer install --no-interaction --prefer-dist --optimize-autoloader
fi

mkdir -p storage/logs bootstrap/cache
chmod -R ug+rw storage bootstrap/cache || true

if ! grep -q '^APP_KEY=base64:' .env; then
  php artisan key:generate --force --ansi
fi

php artisan optimize:clear
php artisan migrate --seed --force
php artisan storage:link || true
php artisan config:cache
php artisan route:cache

exec php artisan serve --host=0.0.0.0 --port=8000
