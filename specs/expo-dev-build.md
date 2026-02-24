# Setup Guide: Expo Dev Build on Julia's iPhone
**Agent Board ID:** task_e8f99cb8239ab16b  
**Type:** Setup (requires Julia's device + Apple Developer account)

---

## Why Dev Build (not Expo Go)

`expo-notifications` for local reminders **does not work in Expo Go on iOS**. We need a dev build — a real `.ipa` that's registered to your device via your Apple Developer account.

---

## Prerequisites

- [ ] Apple Developer account (free tier won't work — needs $99/yr enrollment)
- [ ] Xcode installed on this Mac (latest stable)
- [ ] iPhone connected via USB or on same Wi-Fi
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Logged into EAS: `eas login`

---

## Step 1 — Configure app.json

Ensure `app/app.json` has:

```json
{
  "expo": {
    "name": "Ebb",
    "slug": "ebb-symptom-tracker",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#F5F3FF"
    },
    "ios": {
      "bundleIdentifier": "com.julia.ebb",
      "supportsTablet": false
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#7C5CBF",
          "sounds": []
        }
      ]
    ]
  }
}
```

**Key fields to confirm:**
- `bundleIdentifier`: must be unique, `com.julia.ebb` or `com.yourname.ebb`
- `plugins`: `expo-notifications` must be listed (required for local notifications on iOS)

---

## Step 2 — Configure EAS

From `~/projects/symptom-tracker/app/`:

```bash
eas build:configure
```

This creates `eas.json`. Accept defaults. It should produce:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

---

## Step 3 — Build Dev Client

```bash
cd ~/projects/symptom-tracker/app
eas build --profile development --platform ios
```

- First time: EAS will ask to create/link an Apple Developer team. Log in with your Apple ID.
- Build runs in EAS cloud (~15–20 min first time).
- You'll get a download link for the `.ipa`.

---

## Step 4 — Install on iPhone

**Option A — EAS (easiest):**
```bash
eas build:run --platform ios
```
This installs directly if your phone is registered in your Apple Developer account.

**Option B — Manual (if A fails):**
1. Download the `.ipa` from the EAS build link
2. Open Xcode → Window → Devices and Simulators
3. Drag the `.ipa` onto your device in the list

---

## Step 5 — Run the App

Start the dev server:
```bash
cd ~/projects/symptom-tracker/app
npx expo start --dev-client
```

Open the Ebb app on your iPhone — it will show a QR/URL prompt. Enter the Metro URL shown in terminal or scan the QR code.

---

## Rebuilding

You only need to rebuild (Step 3–4) when:
- Native modules are added or updated
- `app.json` is changed (new plugins, bundle ID, etc.)
- iOS version bumped

For regular code changes (JS/TS/TSX), just save — the dev client hot-reloads.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Developer Mode not enabled" | iPhone: Settings → Privacy & Security → Developer Mode → On |
| App won't open after install | Trust the developer: Settings → General → VPN & Device Management → your Apple ID → Trust |
| Notification permission not appearing | Confirm `expo-notifications` is in `app.json` plugins and you did a fresh build |
| Metro not connecting | Make sure iPhone and Mac are on same Wi-Fi network |
