# Shear Nesting (Android app)

Guillotine (straight cut) nesting for sheet RM pieces. Enter RM sizes and parts with quantities, tap Nest. You get a drawing per RM, wastage (reusable offcuts vs true scrap), weight, a numbered shear cut sequence and a PDF.

## Get the APK (no Android Studio needed)
1. Create a new GitHub repository and upload everything in this folder (keep the `.github` folder).
2. Open the repo, go to Actions, choose "Build APK", press Run workflow.
3. When it finishes (about 5 minutes), open the run and download the artifact `ShearNesting-debug-apk`. Unzip it and copy `app-debug.apk` to your phone.
4. On the phone allow "Install unknown apps" for your file manager, then open the APK.

## Use without installing
Open `dist/ShearNesting.html` in any phone or desktop browser. It works offline.

## Local build (needs Android Studio / SDK)
npm install, then npm run build, npx cap add android, npx cap sync android, then build in Android Studio.
