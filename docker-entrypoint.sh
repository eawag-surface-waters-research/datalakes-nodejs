#!/bin/sh
set -e

echo "Running DB migrations..."
npm run migrate

echo "Starting server..."
npm run start
