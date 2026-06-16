#!/bin/sh
set -e

echo "[entrypoint] executando initdb..."

attempt=1
max_attempts=20
init_ok=0

while [ "$attempt" -le "$max_attempts" ]; do
	if npm run initdb; then
		init_ok=1
		break
	fi

	echo "[entrypoint] initdb falhou, tentativa $attempt/$max_attempts. aguardando 3s..."
	attempt=$((attempt + 1))
	sleep 3
done

if [ "$init_ok" -ne 1 ]; then
	echo "[entrypoint] initdb ainda indisponivel. API sera iniciada e o initdb seguira em background."
	(
		while true; do
			if npm run initdb; then
				echo "[entrypoint] initdb concluido em background."
				break
			fi
			echo "[entrypoint] nova tentativa de initdb em 10s..."
			sleep 10
		done
	) &
fi

echo "[entrypoint] iniciando API..."
exec node dist/app.js
