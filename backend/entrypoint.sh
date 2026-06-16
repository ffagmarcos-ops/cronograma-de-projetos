#!/bin/sh
set -e

echo "[entrypoint] executando initdb..."
npm run initdb

echo "[entrypoint] iniciando API..."
exec node dist/app.js
