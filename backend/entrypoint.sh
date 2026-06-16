#!/bin/sh
set -e

echo "[entrypoint] executando initdb..."

attempt=1
while true; do
	if npm run initdb; then
		echo "[entrypoint] initdb concluido com sucesso."
		break
	fi

	echo "[entrypoint] initdb falhou, tentativa $attempt. aguardando 3s..."
	attempt=$((attempt + 1))
	sleep 3
done

echo "[entrypoint] iniciando API..."
exec node dist/app.js
