# Deploying Credit Manager

Three parts, in this order:

1. **Backend on Render**, so the app works from anywhere
2. **Android app (APK)**, installed once, then opened from the home screen
3. **iPhone via Expo Go**, opened from a link, no laptop needed

The code is already prepared. These steps need your own accounts.

---

## Part 1: Backend on Render

### 1.1 Put the backend on GitHub

1. Go to github.com → **New repository** → name it `credit-manager-backend` → choose **Private** → **Create repository**. Don't add a README.
2. In VS Code, open a terminal in the **Credit Manager Backend** folder and run:

   ```
   git add .
   git commit -m "Credit Manager backend"
   git remote add origin https://github.com/YOUR-USERNAME/credit-manager-backend.git
   git push -u origin main
   ```

   Your `.env` file is **not** uploaded. It's listed in `.gitignore` because it contains your database password.

### 1.2 Let Render connect to MongoDB Atlas

1. Go to cloud.mongodb.com → your project → **Network Access** (left menu).
2. **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`) → **Confirm**.

   Render's addresses keep changing, so it can't be limited to one address. Your database is still protected by its username and password.

### 1.3 Create the Render service

1. Go to render.com → sign up with GitHub → **New** → **Web Service**.
2. Pick the `credit-manager-backend` repository.
3. Fill in:

   | Setting | Value |
   |---|---|
   | Name | `credit-manager-backend` |
   | Region | **Frankfurt** (closest to Nigeria) |
   | Branch | `main` |
   | Build command | `npm install` |
   | Start command | `npm start` |
   | Instance type | **Free** |

4. Under **Environment Variables**, add the two values from your local `.env` file:

   | Key | Value |
   |---|---|
   | `MONGO_URI` | copy from your `.env` |
   | `JWT_SECRET` | copy from your `.env` |

   Don't add `PORT`. Render sets it automatically.

5. **Create Web Service** and wait for **Live** (a few minutes).
6. Copy your address from the top of the page, e.g. `https://credit-manager-backend.onrender.com`.
7. Test it: open `https://YOUR-ADDRESS.onrender.com/health` in a browser. You should see `{"status":"ok"}`.

### 1.4 Stop it falling asleep

Render's free plan sleeps after 15 minutes without use, and then takes up to a minute to wake. To keep it awake:

1. Go to uptimerobot.com → free account → **New monitor**.
2. Type: **HTTP(s)**, URL: `https://YOUR-ADDRESS.onrender.com/health`, interval: **5 minutes** → **Create**.

---

## Part 2: Android app

### 2.1 Point the app at Render

Open `.env.production` in the `credit-manager` folder and replace the placeholder with your Render address:

```
EXPO_PUBLIC_API_URL=https://YOUR-ADDRESS.onrender.com
```

(No `/` at the end. While developing with `npx expo start`, the app still uses your laptop.)

Already done: it is set to `https://credit-manager-backend-fyz7.onrender.com`.

### 2.2 Set up Expo's build service (once)

In a terminal in the `credit-manager` folder:

```
npm install -g eas-cli
eas login
eas init
eas update:configure
```

- `eas login`: your expo.dev account (create one free at expo.dev if needed).
- `eas init`: creates the project on expo.dev and adds its ID to `app.json`. Answer **Yes**.
- `eas update:configure`: sets the app up to receive updates. Answer **Yes**.

Then save everything in git:

```
git add .
git commit -m "Credit Manager app"
```

### 2.3 Build the APK

```
eas build --platform android --profile preview
```

- First time: when asked to generate a new Android keystore, answer **Yes**. Expo stores it for you.
- The build runs on Expo's servers and takes about 10 to 20 minutes. Your laptop can do other things meanwhile.
- When it finishes, you get a link. Open it and download the `.apk` file.

### 2.4 Share and install

1. Send the `.apk` file to Android users (for example as a **document** on WhatsApp).
2. They tap it → **Install**. The first time, Android asks to allow installing from WhatsApp or Chrome: tap **Settings** → turn it on → back → **Install**.
3. **Credit Manager** now has its ₦ icon on their home screen. From then on they just tap the icon.

---

## Part 3: iPhone via Expo Go

1. Publish the app (the two commands under **Sending updates later** below).

2. On expo.dev → your project → **Updates** → open the update you just published. It shows a **link and QR code** for opening it in Expo Go.
3. iPhone users install **Expo Go** from the App Store, then tap your link (send it on WhatsApp). The app opens from the internet. Your laptop can be off.
4. After the first time, it stays in Expo Go under **Recently opened**.

**Please test this on your own iPhone before your defense.** Expo has rules about which published apps Expo Go can open (for example, it may require you to sign in to Expo Go with your Expo account, or the app's runtime version may need adjusting for Expo Go). If it doesn't open, note the exact message and it can be sorted out.

---

## Sending updates later

When you change the app's screens or logic, run these from the `credit-manager` folder:

```
git add .
git commit -m "What you changed"
npx expo export --clear --platform android --platform ios --output-dir dist
eas update --channel preview --environment preview --skip-bundler --input-dir dist --message "What you changed"
```

The first command builds the app with the live backend address from `.env.production`. `--clear` stops an old cached address from sneaking in. The second uploads exactly what was built.

Installed Android apps download it automatically the next time they're opened (it applies on the following launch), and Expo Go users get it too. No reinstalling.

Only rebuild the APK (step 2.3) if you add a new package that includes native code, or change the app icon, name or version in `app.json`.

For the backend: commit and `git push`, and Render redeploys automatically.

---

## Before your defense

- [ ] `https://YOUR-ADDRESS.onrender.com/health` shows `{"status":"ok"}`
- [ ] UptimeRobot monitor is running
- [ ] Log in as `demo_store` / `demo1234` on the installed Android app
- [ ] Reset the demo data if needed: in the backend folder, `node scripts/seedDemo.js`
- [ ] Opened the app on an iPhone through Expo Go using the published link
