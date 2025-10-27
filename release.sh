#!/bin/bash

# ALX Quiz Helper - Release Script
# Usage: ./release.sh 1.0.9

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "❌ Error: Version number required"
  echo "Usage: ./release.sh <version>"
  echo "Example: ./release.sh 1.0.9"
  exit 1
fi

echo "🚀 Preparing release v$VERSION..."

# Update manifest.json version
echo "📝 Updating manifest.json..."
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" manifest.json
sed -i "s/\"version_name\": \"[^\"]*\"/\"version_name\": \"$VERSION\"/" manifest.json

# Update updates.xml (if using external updates)
if [ -f "updates.xml" ]; then
  echo "📝 Updating updates.xml..."
  sed -i "s/version='[^']*'/version='$VERSION'/" updates.xml
  sed -i "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$VERSION/g" updates.xml
fi

# Git operations
echo "📦 Committing changes..."
git add manifest.json
[ -f "updates.xml" ] && git add updates.xml
git commit -m "Release v$VERSION"

echo "🏷️  Creating tag..."
git tag "v$VERSION"

echo "⬆️  Pushing to GitHub..."
git push origin main
git push origin "v$VERSION"

echo ""
echo "✅ Version $VERSION released!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://github.com/YOUR_USERNAME/YOUR_REPO/releases/new"
echo "2. Select tag: v$VERSION"
echo "3. Add release notes"
echo "4. If using CRX distribution:"
echo "   - Pack extension: chrome://extensions/ → Pack extension"
echo "   - Upload .crx file to release"
echo "5. Publish release"
echo ""
echo "🔔 Users will be notified of the update!"

