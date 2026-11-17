# Publish and sell Tripsheet

This guide assumes you want buyers to pay once when they download the app. Apple and Google process that purchase and pay you through your developer account. A paid download uses the store's checkout, so Tripsheet needs no Stripe account, payment code, or purchase screen. Choose your own price and markets. Developer membership fees, commissions, and tax handling vary by store and location.

## 1. Set up your accounts and app identity

1. Create an [Expo account](https://expo.dev/signup).
2. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/enroll/) and sign in to App Store Connect.
3. Create a [Google Play Console account](https://play.google.com/console/signup) and complete its identity and device verification requirements.
4. Check whether the public name **Tripsheet** is available. In `app.json`, confirm that `com.magollap.tripsheet` is the iOS bundle identifier and Android package name you want to own. Change it before registering the listings if needed. Keep each identifier stable after the first upload.
5. Publish a public privacy policy and a support page or contact method. Describe what the app stores, how users can delete records or clear app data, and what happens when they export to another app. Check device backup behavior, Expo dependencies, and the store forms before making disclosures. Prepare real screenshots from both platforms, an app description, and the graphics each store asks for.

## 2. Link Expo and generate signed builds

From the project folder on your computer:

```sh
npm ci
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

Choose your Expo account and create or link the Tripsheet project when prompted. EAS can help create and manage the Android signing key and the iOS distribution certificate and provisioning profile. Keep access to those accounts and signing credentials. Expect an Android App Bundle (`.aab`) and an iOS signed archive (`.ipa`). The identifiers configured in Expo must match the corresponding store records. EAS builds run in the cloud, including when you start an iOS build from Windows or Linux. Check the stores’ current SDK and target API requirements before submitting. [EAS Build guide](https://docs.expo.dev/build/setup/)

If Expo Go is unavailable for your SDK, run `npx eas-cli@latest build --platform android --profile preview` and opening the resulting APK on your phone. For iPhone, use TestFlight below, or register your test device before using the internal profile. [Internal distribution guide](https://docs.expo.dev/build/internal-distribution/)

## 3. Upload and release on Apple’s App Store

1. In **App Store Connect → Business**, have the Account Holder accept the **Paid Apps Agreement**. Complete the required tax and banking forms.
2. Register your bundle identifier in the Apple developer portal if EAS has not registered it. In **App Store Connect → Apps**, add a new iOS app with that bundle ID. Choose a SKU for your own records, such as `tripsheet-ios`.
3. Run `npx eas-cli@latest submit --platform ios --latest` and follow the prompts. Wait for Apple to process the build, then open **TestFlight** and add your internal testers. Install on an iPhone and run the checklist in the README.
4. Fill in the App Store listing, App Privacy answers, age rating, screenshots, support and privacy links, export-compliance answers, and review contact information. Under **Pricing and Availability**, choose your price and territories.
5. In the app version, select the uploaded build and submit it for review. Choose manual release if you want to control when it goes live. After approval, release it when ready. [App Store Connect help](https://developer.apple.com/help/app-store-connect/) · [EAS Submit guide for iOS](https://docs.expo.dev/submit/ios/)

## 4. Upload and release on Google Play

1. In Play Console, set up a **payments profile** for paid apps and complete the requested banking, tax, and merchant verification. Check whether your country supports merchant registration.
2. Create the app in Play Console and choose **Paid**. Set the price and countries before publishing. Google Play does not let a package that has been offered for free switch to paid.
3. Open **Testing → Internal testing**, create a release, complete Play App Signing setup, and upload the EAS `.aab` directly in Play Console for the first upload. Add your testers and open the opt-in link on an Android device. Run the README checklist.
4. Complete any production access requirements shown in the Console. New personal accounts subject to Google's testing rules currently need a closed test with at least 12 testers opted in for 14 continuous days before applying for production access. Check your account’s requirements.
5. Complete the store listing, Data safety form, privacy policy, content rating, target audience, ads declaration, and other required app content forms. Create a production release, select the tested bundle, and submit it for review. Use managed publishing if you want to control when approved changes go live. [Play Console help](https://support.google.com/googleplay/android-developer/) · [Production access testing rules](https://support.google.com/googleplay/android-developer/answer/14151465) · [Set up app pricing](https://support.google.com/googleplay/android-developer/answer/6334373)

## 5. Check the live listings

Confirm each public listing shows the intended price and countries. Verify the download and the app’s logging and sharing behavior on both platforms. For updates, make a new EAS production build and submit it to the existing listings. The production profile automatically increments store build numbers.
