#!/bin/bash

# Ask for commit message
echo "Enter commit message: "
read message

# Add all changes
git add .

# Commit changes
git commit -m "$message"

# Push to GitHub
git push origin main

echo "Changes pushed! Netlify will rebuild and deploy automatically."