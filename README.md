# MockBySu — IBPS SO IT Officer Mock Exam

Build your own mock test, take it under a clock, and keep every attempt on
your own device. No accounts, no backend, no server-side scoring — the whole
app runs client-side and stores everything in the browser's local storage.

**Live app:** https://mockbysu.vercel.app
**Android app:** distributed as a signed APK via [GitHub Releases](https://github.com/sushovancpp/mockbysu/releases)

---

## What it does

1. **Configure** a paper — pick subjects, question count, and a time limit.
2. **Generate a prompt** the app writes for you, ready to paste into any
   chatbot (ChatGPT, Claude, Gemini, etc.).
3. **Paste the chatbot's JSON response back** into the app.
4. **Take the exam** under the clock, with auto-submit on timeout.
5. **Review the result** — subject-wise breakdown, accuracy, and a
   question-by-question review with explanations.
6. **History** — every past attempt stays on the device, browsable at any time.

Nothing is uploaded anywhere. The question paper, your answers, and your
score history all live in `localStorage` on the device you took the test on.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack, static export) |
| UI | React 19, Tailwind CSS 4 |
| Fonts | [Geist Sans / Geist Mono](https://vercel.com/font) |
| Mobile shell | [Capacitor 8](https://capacitorjs.com) (Android) |
| Hosting | [Vercel](https://vercel.com) (web) |
| Distribution (Android) | Signed APK via GitHub Actions → GitHub Releases |
| Language | TypeScript |

### Why the Android app is a thin shell, not a bundled offline app

`capacitor.config.ts` points `server.url` at the live Vercel deployment
rather than bundling `webDir` content into the APK:

```ts
server: {
  url: "https://mockbysu.vercel.app",
  cleartext: false,
}
```

This means the Android app always loads the current live site. **Every
normal code change (UI, logic, question-generation prompt, scoring, etc.)
ships instantly to every installed copy of the app the next time it's
opened — no new APK, no user action, no app-store review.**

A new APK release is only needed when the **native shell itself** changes —
e.g. a new Capacitor plugin, a permission change, an app icon change, or a
`minSdk`/`targetSdk` bump. Those are rare, which is why the project also
ships an in-app update checker (below) that only matters for that narrow
case.

---

## Project structure

```
app/
  page.tsx              Landing screen — last attempt, entry point
  configure/             Pick subjects, question count, timer
  prompt/                 Generated prompt to paste into a chatbot
  import/                 Paste the chatbot's JSON response back in
  exam/                   The timed exam screen
  result/page.tsx        Result + review (static route, reads ?id= from
                          the URL — see note below)
  history/               List of all past attempts
  layout.tsx              Root layout — fonts, metadata, mounts <UpdateBanner />
components/
  ui.tsx                  Shared UI primitives (Screen, ActionBar, LinkButton, etc.)
  UpdateBanner.tsx        In-app "update available" banner (Android only)
lib/
  storage.ts              localStorage read/write helpers for history & session
  scoring.ts               Scoring + formatting helpers
  types.ts                 Shared TypeScript types (ExamResult, ExamSession, etc.)
  update.ts                GitHub Releases version-check logic
android/                  Capacitor-generated native Android project
.github/workflows/        CI: build, sign, and release the Android APK
```

### Why `/result` is a static route with a query param, not `/result/[id]`

The app uses `output: "export"` for the Capacitor build, which produces a
fully static site. Next.js requires `generateStaticParams()` for any
dynamic route segment (`[id]`) under static export — but result IDs only
exist in a given device's `localStorage`, so they can't be known at build
time.

Instead, `/result` is a plain static route that reads the ID from a query
string (`/result?id=<id>`) via `useSearchParams()`, wrapped in a
`<Suspense>` boundary as required by Next.js. This needs no build-time
knowledge of which IDs exist.

---

## Local development

```bash
npm install
npm run dev
```

Runs the app at `http://localhost:3000` with hot reload. No environment
variables or backend are required — everything is client-side.

### Other scripts

```bash
npm run build       # Production build (static export)
npm run start        # Serve the production build locally
npm run lint          # ESLint
npm run typecheck    # tsc --noEmit
```

---

## Android app

### Prerequisites

- Node.js 22+
- Java 21 (Temurin)
- Android SDK (via Android Studio, or the CI's runner-preinstalled SDK)

### Local Android build

```bash
npm install
npx cap sync android
cd android
./gradlew assembleRelease
```

A signed release needs `android/keystore.properties` (not committed) —
see `.github/workflows/android-release.yml` for the expected format, or
build an unsigned debug APK with `./gradlew assembleDebug` instead.

### CI/CD — how a release gets built

`.github/workflows/android-release.yml` runs on every push to `main`:

```
push to main
  → checkout, Node 22, Java 21
  → locate & use the runner's preinstalled Android SDK cmdline-tools
  → accept SDK licenses, install platform-tools / platforms;android-34 / build-tools;34.0.0
  → npm install
  → npx cap sync android
  → restore signing keystore from repo secrets
  → ./gradlew assembleRelease
      -PversionCode=<github.run_number>
      -PversionName=1.0.<github.run_number>
  → rename output to MockBySu.apk
  → create a GitHub Release (tag v1.0.<run_number>) with the APK attached
```

`android/app/build.gradle` reads those `-P` properties at build time:

```groovy
versionCode project.hasProperty('versionCode') ? project.property('versionCode').toInteger() : 1
versionName project.hasProperty('versionName') ? project.property('versionName') : "1.0"
```

so every CI-built APK carries a real, incrementing version — not the
hardcoded `1` / `"1.0"` placeholder that ships with a fresh Capacitor
project.

### Required repo secrets

| Secret | Purpose |
|---|---|
| `KEYSTORE_BASE64` | Base64-encoded `.jks` signing keystore |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Signing key alias |
| `KEY_PASSWORD` | Signing key password |

### In-app update checker

Since the app loads the live site remotely, most changes need no update
flow at all (see above). But for the rare case where the **native shell**
changes and a new APK is genuinely required, `lib/update.ts` +
`components/UpdateBanner.tsx` handle it:

1. On load (native platform only), `checkForUpdate()` calls
   `App.getInfo()` (from `@capacitor/app`) to read the installed
   `versionCode`, and fetches
   `GET /repos/sushovancpp/mockbysu/releases/latest` from the GitHub API.
2. It compares the trailing number in the release tag (`v1.0.<N>`) against
   the installed `versionCode`.
3. If a newer release exists, `<UpdateBanner />` (mounted in
   `app/layout.tsx`, visible on every screen) shows a "Download" action
   that opens the release's `.apk` asset via `@capacitor/browser`'s
   `Browser.open()` — handing off to the system browser so Android's real
   download manager and package-installer flow can take over. A plain
   in-WebView `<a href>` won't reliably trigger this, which is why
   `@capacitor/browser` is used instead of a direct link.
4. Failures (no network, GitHub API rate limits, etc.) are swallowed
   silently — a broken update check should never block the app.

> **Note:** this project distributes APKs via GitHub Releases, not the
> Google Play Store, so `com.google.android.play:app-update` (Play Core)
> is intentionally **not** used — it only functions for Play
> Store-installed apps and would silently no-op here.

---

## Data & privacy

- No backend, no analytics, no accounts.
- The generated question paper, your answers, and your score history are
  stored entirely in the device's browser `localStorage`
  (see `lib/storage.ts`).
- Clearing browser data / app storage erases all history permanently —
  there is no cloud backup.

---

## License

Personal project — no license specified. All rights reserved unless
stated otherwise.

@Sushovan Masanta
