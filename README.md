# Tripsheet

Tripsheet is an Expo app for recording one vehicle’s trips and fuel purchases on iOS and Android.

- **Log trip** records the starting and ending odometer. Trip miles are ending minus starting mileage. The total adds up logged trips, so skipped trips are excluded.
- **Log fill-up** records the current device date and time, odometer, amount in US gallons, and whether the tank was filled to full. MPG is calculated after two full tanks using the odometer difference divided by the fuel added after the first full tank, including any partial fills. Log each fill for an accurate result.
- **Analytics** shows miles over the last seven days, six Monday-start weeks, or six calendar months. Trips count toward the date on which you save them.
- **History** lists trips and fill-ups. Tap a record there to delete it.
- **Export** opens the phone’s share sheet with a CSV file. Choose Mail, WhatsApp, Messages, or another available file-sharing app. The available choices depend on your device and installed apps.

Records are stored on the phone. Tripsheet has no account, server, or cross-device sync. Export records you want to keep before removing the app or clearing its data.

## Run it on a phone

1. Install [Node.js 24 LTS](https://nodejs.org/) on your computer. Open a terminal in the TripSheet checkout, where this README and `package.json` are.
2. Run `npm ci`, then `npm start`.
3. Install [Expo Go](https://expo.dev/go) if its version supports this project’s Expo SDK 58. Connect your phone and computer to the same Wi-Fi. Scan the QR code with the camera on iOS or the Expo Go scanner on Android. If Expo Go is incompatible, use an EAS preview build as described in the [store guide](STORE_RELEASE.md).
4. Log a trip from 1000 to 1050 and check that the dashboard shows 50 miles. Log a full fill at 1050 mi, a partial fill of 2 gal at 1100 mi, and a full fill of 3 gal at 1200 mi. Check for 30 MPG and verify each fill shows the device time.
5. Close and reopen the app and confirm the records are still there. Switch between Daily, Weekly, and Monthly. Tap the export icon and open the CSV from the share sheet. Try sharing the file from both platforms before releasing.

Run `npm test` for the calculation and CSV tests. Run `npx expo export --platform ios` and `npx expo export --platform android` to check each JavaScript bundle.

See the [publishing and pricing guide](STORE_RELEASE.md) for TestFlight, Google Play, and paid downloads.
