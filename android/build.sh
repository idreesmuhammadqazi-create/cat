#!/usr/bin/env bash
# Builds marmalade.apk without Gradle, using the Android SDK build tools.
# Requirements: JDK 17+, Android SDK with build-tools;34.0.0 and platforms;android-34.
set -euo pipefail

cd "$(dirname "$0")"

SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/opt/android-sdk}}"
BT="$SDK/build-tools/34.0.0"
PLATFORM="$SDK/platforms/android-34/android.jar"
JAVA_HOME="${JAVA_HOME:-/opt/jdk17}"
OUT="$PWD/build"

if [ ! -x "$BT/aapt2" ] || [ ! -f "$PLATFORM" ]; then
  echo "Android SDK 34 not found under $SDK" >&2
  echo "Set ANDROID_SDK_ROOT or install build-tools;34.0.0 and platforms;android-34" >&2
  exit 1
fi

export PATH="$JAVA_HOME/bin:$PATH"

rm -rf "$OUT"
mkdir -p "$OUT/res" "$OUT/gen" "$OUT/classes" "$OUT/dex"

echo "==> resources"
"$BT/aapt2" compile --dir res -o "$OUT/res.zip"
"$BT/aapt2" link \
  -o "$OUT/base.apk" \
  -I "$PLATFORM" \
  --manifest AndroidManifest.xml \
  --java "$OUT/gen" \
  --min-sdk-version 26 \
  --target-sdk-version 34 \
  --version-code 1 \
  --version-name 1.0 \
  "$OUT/res.zip"

echo "==> java"
find src "$OUT/gen" -name '*.java' > "$OUT/sources.txt"
javac -encoding UTF-8 --release 11 \
  -classpath "$PLATFORM" \
  -d "$OUT/classes" \
  @"$OUT/sources.txt"

echo "==> dex"
"$BT/d8" --lib "$PLATFORM" --min-api 26 --output "$OUT/dex" \
  $(find "$OUT/classes" -name '*.class')

cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT" && zip -qj unsigned.apk dex/classes.dex)
"$BT/zipalign" -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

echo "==> sign"
if [ ! -f "$OUT/keystore.jks" ]; then
  keytool -genkeypair -v \
    -keystore "$OUT/keystore.jks" \
    -alias marmalade \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass marmalade \
    -keypass marmalade \
    -dname "CN=marmalade, OU=floating pet, O=marmalade, C=US" >/dev/null 2>&1
fi

"$BT/apksigner" sign \
  --ks "$OUT/keystore.jks" \
  --ks-key-alias marmalade \
  --ks-pass pass:marmalade \
  --key-pass pass:marmalade \
  --out "$OUT/marmalade.apk" \
  "$OUT/aligned.apk"

"$BT/apksigner" verify --print-certs "$OUT/marmalade.apk" | head -6
cp "$OUT/marmalade.apk" ./marmalade.apk

echo "==> built $(pwd)/marmalade.apk"
ls -lh ./marmalade.apk
