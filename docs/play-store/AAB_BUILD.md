# Signed AAB Build — EasyHome Customer & Worker

## Prerequisites (already configured)

- Android Studio / JDK 21 (`org.gradle.java.home=C:\Users\ikkag\.gradle\jdks\eclipse_adaptium-21-amd64-windows.2`)
- Android SDK: compileSdk 36, targetSdk 36, minSdk 24
- AGP 8.13.0, google-services 4.4.4
- Release keystore: `android/app/easyhome-release.keystore` and `android-worker/app/easyhome-release.keystore`
  - alias: `easyhome`
  - store password / key password: `easyhomeRelease2026`

## Build commands

### Customer app (`com.easyhome.customer`)

```bash
cd /path/to/EasyHome/easyhomes/android
C:/Users/ikkag/.gradle/wrapper/dists/gradle-8.14.3-all/<hash>/gradle-8.14.3/bin/gradle.bat :app:bundleRelease --no-daemon
```

**Expected artifact:**

```
android/app/build/outputs/bundle/release/easyhome-release.aab
```

### Worker app (`com.easyhome.worker`)

```bash
cd /path/to/EasyHome/easyhomes/android-worker
C:/Users/ikkag/.gradle/wrapper/dists/gradle-8.14.3-all/<hash>/gradle-8.14.3/bin/gradle.bat :app:bundleRelease --no-daemon
```

**Expected artifact:**

```
android-worker/app/build/outputs/bundle/release/easyhome-worker-release.aab
```

## Output / upload notes

- Upload the two `.aab` files to Google Play Console → **Production** → **Create new release**.
- Both apps use `versionCode 1`, `versionName "1.0"`.
- Release build keeps `minifyEnabled false` and the release signing config; do not enable
  ProGuard/R8 until a proper shrinking strategy for the Capacitor WebView bundle is validated.
- Play requires **targetSdk 35+** — satisfied (36).
- Play requires **minSdk 21+** — satisfied (24).

## App integrity / versioning

| App | package | versionCode | versionName |
| --- | --- | --- | --- |
| Customer | com.easyhome.customer | 1 | 1.0 |
| Worker | com.easyhome.worker | 1 | 1.0 |

## Next version increments

When publishing updates: bump `versionCode` (+1) and `versionName` (e.g. `1.1`) in both
`android/app/build.gradle` and `android-worker/app/build.gradle`, then rebuild
`:app:bundleRelease`.
