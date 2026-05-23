#!/bin/sh
set -e

node_modules/.bin/prisma db push --skip-generate --accept-data-loss

exec node server.js
