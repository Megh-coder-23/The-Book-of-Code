#!/bin/bash

# macOS terminal friendly commit and push helper
# Usage: ./commit_and_push.sh "Commit message"

if [[ -z "$1" ]]; then
  echo "Usage: $0 \"Commit message\""
  exit 1
fi

git add .
git commit -m "$1"
git push
