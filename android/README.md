# marmalade — floating Android app

This is the native Android build: a real overlay pet. She runs on top of whatever app
you're using until you stop her. Built and tested on Android 14 (API 34).

The installable web version of marmalade lives in the repo root; this folder is the
floating-pet app.

## install

1. Copy `marmalade.apk` to your phone (or download it from the artifacts).
2. Open it. Android will ask to allow installs from this source — allow it for your file
   manager/browser, then tap **Install**.
3. Open **marmalade** and:
   - tap **allow display over other apps** and enable it,
   - allow notifications (Android 13+) so the Stop control is available,
   - tap **let her out**.
4. She's now over your other apps. Use your phone normally; she keeps running.

## stopping her

- **Stop** on her notification, or
- open marmalade and tap **call her back**.

Swiping the app from recents does not stop a foreground service — that's what keeps her
out while you use other apps. Force stop or a reboot will end her too.

## what's inside

- `MainActivity` — permission/setup screen, start/stop, saved pat count.
- `PetService` — foreground service (`specialUse`) + `TYPE_APPLICATION_OVERLAY` window.
  Uses `START_STICKY` so the system can bring her back if it kills the service.
- `PetView` — the cat is drawn with Android Canvas at 60fps: gait, tail wag, blinking,
  pat squish, floating hearts, purr bubbles, drag to move, screen-edge clamping.
- Pats are saved in SharedPreferences (`marmalade.pats`).

No internet permission. No accounts. No analytics.

## build

Requirements: JDK 17+, Android SDK with `build-tools;34.0.0` and `platforms;android-34`.

```sh
./build.sh          # uses /opt/android-sdk by default
ANDROID_SDK_ROOT=~/Android/Sdk ./build.sh
```

It compiles resources with `aapt2`, Java with `javac`, dexes with `d8`, then zipaligns
and signs with `apksigner`. The signing key is generated into `build/keystore.jks` on
first build (self-signed, fine for sideloading; use your own key for store uploads).
Output: `marmalade.apk`.

## notes / limitations

- **Some apps hide overlays.** Android lets apps opt out of non-system overlays
  (`HIDE_OVERLAY_WINDOWS`). Settings, banking apps and some DRM apps do this, so she
  disappears while those are in front (and comes back when you leave). This is an OS
  security rule, not something an app can override.
- **Battery optimisation** can stop her on aggressive OEM builds. Exclude marmalade from
  optimisation to keep her running all day.
- The overlay window is only as big as the cat, so touches outside her pass through to
  the app underneath. The transparent area around her is still part of her window.
- She is drawn over the status bar area if she runs to the very top; the window keeps a
  small inset to avoid the system bars.
- Target SDK 34, min SDK 26 (Android 8+).
