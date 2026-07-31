#!/bin/sh
set -eu
pnpm run db:migrate
exec node apps/api/dist/index.js
