#!/bin/sh

echo "=== Docker Entrypoint ==="

# Prisma CLI from isolated install (has all transitive deps)
PRISMA="node /prisma-cli/node_modules/prisma/build/index.js"

echo "Running database migrations..."
$PRISMA migrate deploy 2>&1 || echo "WARNING: Migration failed or no migrations to run"

echo "Running database seed (upsert — safe to re-run)..."
node prisma/seed-prod.js 2>&1 || echo "WARNING: Seed failed"

echo "Starting Next.js server..."
exec node server.js
