# Firebase Setup — ESINSA SGA

## Project Info

| Field | Value |
|-------|-------|
| Project ID | `sga-esinsa-astrojs` |
| Project Number | `582808148293` |
| Web App | Already registered |
| Auth Domain | `sga-esinsa-astrojs.firebaseapp.com` |

## 1. Authentication Providers

### Enable in Firebase Console

Go to [Firebase Console → Authentication → Sign-in method](https://console.firebase.google.com/project/sga-esinsa-astrojs/authentication/providers)

#### Email/Password
- Status: **Already enabled**
- Settings: Allow email sign-up ✅

#### Google Sign-In
1. Click **Google** → Enable
2. Set **Project support email** (your email)
3. **Web SDK configuration** → Copy the **Web client ID** (needed for authorized domains)
4. Click **Save**

#### Phone Authentication
1. Click **Phone** → Enable
2. Set **Phone numbers for testing** (optional, for dev)
3. Click **Save**

### Authorized Domains

Go to [Firebase Console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/sga-esinsa-astrojs/authentication/settings)

Add these domains:
- `localhost` (local dev)
- Your production domain (e.g., `esinsa-sga-app.up.railway.app`, `senseikatana.com`)

> **CRITICAL**: Do NOT include `http://` or port numbers. Just `localhost`.

## 2. Firestore Database

### Create via Firebase Console

1. Go to [Firebase Console → Firestore Database](https://console.firebase.google.com/project/sga-esinsa-astrojs/firestore)
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select location: **nam5 (United States)** or closest to your users
5. Click **Enable**

### Create via CLI

```bash
npx -y firebase-tools@latest firestore:databases:create default --location=nam5
```

### Recommended Security Rules

After creating the database, go to **Rules** tab and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read/write their own profile
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }

    // Warehouse items — authenticated users can read, admins can write
    match /warehouse/{itemId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Default: deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Click **Publish** to deploy rules.

## 3. Web App Configuration

Already configured. The `.env` file contains:

```
PUBLIC_FIREBASE_API_KEY=AIzaSyDGby4AccS7nWvhbqEWzeOPQ6K1OHjzcmM
PUBLIC_FIREBASE_AUTH_DOMAIN=sga-esinsa-astrojs.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=sga-esinsa-astrojs
PUBLIC_FIREBASE_STORAGE_BUCKET=sga-esinsa-astrojs.firebasestorage.app
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=582808148293
PUBLIC_FIREBASE_APP_ID=1:582808148293:web:2b856a986a5a0d5161862c
```

### Code Changes Made

- `src/lib/firebase.ts` — Added Google Auth provider, Phone Auth, RecaptchaVerifier, Firestore exports
- `src/lib/firestore.ts` — New file: generic Firestore CRUD helpers + domain-specific functions
- `src/components/AuthProvider.tsx` — Added `signInWithGoogle()`, `signInWithPhone()`, `confirmPhoneCode()`
- `src/pages/signin.astro` — Google button now works, Phone auth tab added

## 4. Android App Registration

### Via Firebase Console

1. Go to [Firebase Console → Project Settings → General](https://console.firebase.google.com/project/sga-esinsa-astrojs/settings/general)
2. Click **Add app** → **Android**
3. Enter **Android package name**: `com.esinsa.sga` (or your actual package)
4. Enter **App nickname**: `ESINSA SGA Android`
5. Enter **SHA-1 certificate fingerprint** (for Google Sign-In on Android):
   ```bash
   # Debug key
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

   # Release key
   keytool -list -v -keystore your-release-key.keystore -alias your-alias
   ```
6. Click **Register app**
7. Download `google-services.json`
8. Place it at: `android/app/google-services.json`

### Via Firebase CLI

```bash
npx -y firebase-tools@latest apps:create android com.esinsa.sga --display-name "ESINSA SGA Android"
npx -y firebase-tools@latest apps:sdkconfig ANDROID <APP_ID> --project sga-esinsa-astrojs
```

### Android Integration

Add to `android/build.gradle`:
```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.4.2'
}
```

Add to `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'
```

## 5. iOS App Registration

### Via Firebase Console

1. Go to [Firebase Console → Project Settings → General](https://console.firebase.google.com/project/sga-esinsa-astrojs/settings/general)
2. Click **Add app** → **iOS+**
3. Enter **Bundle ID**: `com.esinsa.sga` (must match Xcode project)
4. Enter **App nickname**: `ESINSA SGA iOS`
5. Enter **App Store ID** (optional, can add later)
6. Click **Register app**
7. Download `GoogleService-Info.plist`
8. Add it to your Xcode project (drag into the project navigator)

### Via Firebase CLI

```bash
npx -y firebase-tools@latest apps:create ios com.esinsa.sga --display-name "ESINSA SGA iOS"
npx -y firebase-tools@latest apps:sdkconfig IOS <APP_ID> --project sga-esinsa-astrojs
```

### iOS Integration

In Xcode:
1. File → Add Files → Select `GoogleService-Info.plist`
2. Ensure "Copy items if needed" is checked
3. Add to your app target

In `AppDelegate.swift`:
```swift
import FirebaseCore
import FirebaseFirestore
import FirebaseAuth

func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    FirebaseApp.configure()
    return true
}
```

## 6. Phone Auth — Testing

### Test Phone Numbers

In Firebase Console → Authentication → Sign-in method → Phone → Phone numbers for testing, add:

| Phone Number | Verification Code |
|-------------|------------------|
| +52 55 1234 5678 | 123456 |
| +34 600 000 000 | 654321 |

These work in development without sending real SMS.

### reCAPTCHA

Phone auth requires reCAPTCHA verification. In the code, we use `RecaptchaVerifier` with `size: 'invisible'`. For production:

1. Go to Firebase Console → Authentication → Settings → App verification
2. Ensure reCAPTCHA is enabled for web
3. For Android: ensure SHA-1 is registered
4. For iOS: ensure APNs is configured

## 7. Multi-Platform Deployment Checklist

- [ ] Email/Password auth enabled
- [ ] Google Sign-In enabled
- [ ] Phone auth enabled
- [ ] Authorized domains configured (localhost + production)
- [ ] Firestore database created
- [ ] Firestore security rules deployed
- [ ] Web app config in `.env`
- [ ] Android `google-services.json` placed (if building Android)
- [ ] iOS `GoogleService-Info.plist` placed (if building iOS)
- [ ] SHA-1 fingerprint registered (for Android Google Sign-In)
- [ ] Test phone numbers configured
- [ ] Production domain added to authorized domains
