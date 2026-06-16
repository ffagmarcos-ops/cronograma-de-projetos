#!/bin/sh
set -e

echo "[entrypoint] executando initdb..."

attempt=1
max_attempts=15

until npm run initdb; do
	if [ "$attempt" -ge "$max_attempts" ]; then
		echo "[entrypoint] initdb falhou apos $max_attempts tentativas"
		exit 1
	fi

	echo "[entrypoint] initdb falhou, tentativa $attempt/$max_attempts. aguardando 3s..."
	attempt=$((attempt + 1))
	sleep 3
done

echo "[entrypoint] iniciando API..."
exec node dist/app.js
