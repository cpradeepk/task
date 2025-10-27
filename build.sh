#!/bin/bash
set -e

echo "Verifying dependencies..."
if [ ! -d "node_modules" ]; then
  echo "node_modules not found, installing dependencies..."
  npm install
fi

echo "Building web app..."
npm run build:web

echo "Copying build artifacts to root..."
rm -rf .next public
cp -r apps/web/.next .next
cp -r apps/web/public ./public

echo "Build complete!"
ls -la .next/routes-manifest.json

