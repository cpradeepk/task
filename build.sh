#!/bin/bash
set -e

echo "Building web app..."
npm run build:web

echo "Copying build artifacts to root..."
rm -rf .next public
cp -r apps/web/.next .next
cp -r apps/web/public ./public

echo "Build complete!"
ls -la .next/routes-manifest.json

