#!/bin/bash
# Builds the Safari version with your own Apple Development certificate
# and installs it to /Applications. Requires Xcode, signed in with any Apple ID
# (Xcode > Settings > Accounts).
set -euo pipefail
cd "$(dirname "$0")/safari/LinearFeed"

TEAM_ID=$(security find-certificate -c "Apple Development" -p 2>/dev/null \
  | openssl x509 -noout -subject 2>/dev/null \
  | sed -n 's/.*OU *= *\([A-Z0-9]*\).*/\1/p' | head -1)
if [ -z "$TEAM_ID" ]; then
  echo "No Apple Development certificate found. Open Xcode > Settings > Accounts, sign in, then run this again."
  exit 1
fi

BUILD_DIR=$(mktemp -d)
xcodebuild -project LinearFeed.xcodeproj -scheme LinearFeed -configuration Release \
  -derivedDataPath "$BUILD_DIR" DEVELOPMENT_TEAM="$TEAM_ID" CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates build -quiet

APP="$BUILD_DIR/Build/Products/Release/LinearFeed.app"
rm -rf /Applications/LinearFeed.app
cp -R "$APP" /Applications/

# Forget the build copy so Safari doesn't list the extension twice.
pluginkit -r "$APP/Contents/PlugIns/LinearFeed Extension.appex" 2>/dev/null || true
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -u "$APP" 2>/dev/null || true
rm -rf "$BUILD_DIR"

open /Applications/LinearFeed.app
echo "Installed. If this is your first install, enable LinearFeed in Safari > Settings > Extensions."

# Safari keeps the old extension code in memory until it restarts.
if pgrep -xq Safari; then
  read -r -p "Restart Safari now so the new version loads? Open windows come back. [y/N] " answer
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    osascript -e 'quit app "Safari"'
    while pgrep -xq Safari; do sleep 0.5; done
    open -a Safari
  else
    echo "Quit Safari (Cmd+Q) and reopen it to load the new version."
  fi
fi
