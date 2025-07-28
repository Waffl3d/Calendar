#!/bin/bash
echo "Installing dependencies..."
npm install

echo "Building React project..."
npm run build

if [ $? -eq 0 ]; then
  echo "Build successful!"
  echo "Opening build folder..."
  open build
else
  echo "Build failed. Check errors above."
  exit 1
fi
