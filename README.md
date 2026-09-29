<p align="center">
  <img src="assets/icon.png" width="96" alt="KM Calc icon" />
</p>

<h1 align="center">KM Calc</h1>

<p align="center">
  Know how many kilometres you have left on your rental car, and what going over will cost.
</p>

<p align="center">
  <a href="https://github.com/Brahimhz/KmCalc/releases/latest"><b>Download for Android (APK)</b></a>
  &nbsp;·&nbsp;
  <a href="https://brahimhz.github.io/KmCalc/"><b>Open the web app</b></a>
</p>

<p align="center">
  <img src="docs/screenshots/on-track.png" width="200" alt="KM remaining with the daily budget" />
  <img src="docs/screenshots/over-limit.png" width="200" alt="Over the limit with the extra charge" />
  <img src="docs/screenshots/dark-mode.png" width="200" alt="Dark mode" />
  <img src="docs/screenshots/defaults.png" width="200" alt="Editing the default values" />
</p>

## What it does

Enter the odometer reading from when you picked up the car and today's reading. KM Calc shows:

- **KM remaining** in your allowance, with a progress bar and the odometer reading you must stay below.
- **Extra km and the extra charge** when you go over the allowance (0.5 AED per km by default).
- **Days left** and the return date of the rental.
- Your **daily average** so far and a **daily budget** to stay within the limit.
- A **projection** of where your current pace takes you by the end of the rental, and when you would hit the limit.

Everything is saved on the device automatically.

### Default values (all editable)

| Setting | Default |
| --- | --- |
| KM allowance | 2,500 km |
| Rental period | 1 month (in days, weeks or months) |
| Charge per extra km | 0.5 |
| Currency | AED |

- Every value can be changed for the current rental on the main screen.
- To change the defaults themselves, tap the sliders icon (or **Edit** at the bottom). New rentals use them, and you can apply them to the current rental too. **Restore original values** brings back the values above.
- The allowance can be for the **whole rental** or **per day / week / month** (e.g. 2,500 km per month on a 3 month rental = 7,500 km).
- **Start a new rental** resets the readings and the contract to your defaults. Tick *Same car* when you renew, to continue from the current odometer.

## How it calculates

```text
used km       = current odometer − start odometer
allowance     = KM allowance (× rental length when it is per day / week / month)
km remaining  = allowance − used km
extra km      = used km − allowance          (when above the allowance)
extra charge  = extra km × charge per extra km
daily budget  = km remaining ÷ days left
projection    = daily average × days in the rental
```

## Install

- **Android:** download `KmCalc-vX.Y.Z.apk` from the [latest release](https://github.com/Brahimhz/KmCalc/releases/latest) and open it on your phone. Allow installing from your browser or files app when Android asks.
- **Any phone or computer:** use the [web app](https://brahimhz.github.io/KmCalc/). On a phone, use *Add to Home screen* to open it like an app. Its data is stored in that browser.
- **iPhone:** the code is cross-platform (Expo / React Native), so an iOS build can be made with EAS or Xcode. Until then, use the web app.

## Development

Built with [Expo](https://expo.dev) SDK 57 (React Native 0.86, TypeScript): one codebase for Android, iOS and the web.

```bash
npm install
npm start          # dev server: press "a" for a connected Android phone/emulator, "w" for the web
npm test           # unit and UI tests (Jest + React Native Testing Library)
npm run check      # type check, lint and tests
npm run build:web  # static web build in dist/
```

```text
App.tsx            app shell: theme, saved data, screen switching
src/logic/         calculations (calc, dates, numbers): pure functions with unit tests
src/state/         rental form, defaults and on-device storage
src/screens/       Calculator and Default values screens
src/components/    fields, result card, calendar, dialogs...
__tests__/         UI tests
```

### Releasing the Android app

The APK is built by GitHub Actions ([android.yml](.github/workflows/android.yml)):

1. Bump `version` and `android.versionCode` in `app.json` so phones install it as an update.
2. Push a version tag; the workflow attaches the APK to a new release:

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

You can also run the **Android APK** workflow from the Actions tab and download the APK artifact.

The APK is signed with the release key stored in the repository secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD` and `ANDROID_KEY_ALIAS` (it falls back to the debug key when they are missing, e.g. in forks). Keep a backup of the keystore: updates must be signed with the same key.

To build on your own machine you need the Android SDK and JDK 17:

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

Every push to `main` also publishes the web app to GitHub Pages ([pages.yml](.github/workflows/pages.yml)).

## License

[MIT](LICENSE)
