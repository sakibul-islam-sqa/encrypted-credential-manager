# Credential Manager

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

A zero-knowledge, cloud-backed credential, URL and notes manager built for QA / SQA engineers who juggle multiple apps across many environments (Local, Dev, QA, Staging, UAT, Pre-Prod, Production, Sandbox, Demo, custom).

Sign in with **email/password or Google** for identity, then unlock your vault with a **separate master password**. All credential data is AES-256-GCM encrypted in your browser before it ever touches Firestore - so even Firebase admins cannot read your saved credentials.

## Features

- Identity via **Firebase Auth** (email/password or Google)
- Three encrypted spaces sharing the same master password:
  - **Credentials**: one encrypted document per user (compact)
  - **URLs**: per-app, per-environment, per-variant URL matrix
  - **Notes**: rich-text notes (TipTap editor) with headings, lists, tables, task lists, links, blockquotes and syntax-highlighted code blocks (JS/TS, bash, JSON, YAML, SQL, Python, HTML/CSS, Markdown). Stored as HTML, encrypted **one document per note** so large notes don't run into the 1 MiB Firestore document cap
- Everything encrypted in-browser with **AES-256-GCM**, key derived from your master password via **PBKDF2-SHA256 (250,000 iterations)** with a unique per-user salt
- Master password is never sent anywhere; either held in memory only, or the derived (non-extractable) AES key is cached in IndexedDB for a duration you pick at unlock time (1 hour / 1 day / 7 days / 30 days)
- 7-day rolling Firebase session, with a "session expires in N days" indicator
- Locks instantly on demand from the user menu
- Store per app + per environment:
  - URL (opens in a new tab)
  - Username, email, password, role
  - Tags and free-form notes
- Strong password generator (20 chars, mixed pools, crypto-random)
- Quick search across app, URL, username, email, notes, tags
- Filter by app and by environment
- **Notes**: modern rich-text editor (TipTap) with toolbar, slash-Markdown shortcuts (`# H1`, `- list`, ` ``` code `), tables, task lists, code blocks (JS/TS, bash, JSON, YAML, SQL, Python, HTML/CSS, Markdown); tag, pin, search; lazy-loaded chunk so credentials-only users don't pay the bundle cost
- Color-coded environment chips (Prod is red, QA green, etc.)
- One-click copy for URL / username / email / password (with toast feedback)
- Show / hide password per row
- Encrypted JSON import & export (portable across accounts)
- Light & dark themes (synced with system preference)
- Offline cache: keeps the last-known encrypted blob locally so you can unlock + work offline
- Fully responsive UI

## How the two passwords differ

|                   | Account password (or Google)               | Master password                                                |
| ----------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Where it lives    | Firebase Auth (hashed on Google's servers) | Only in your head                                              |
| Purpose           | Proves who you are                         | Encrypts your vault                                            |
| Recoverable?      | Yes - via password reset email             | **No** - if lost, vault is unrecoverable (export periodically) |
| Sent to Firebase? | Yes (HTTPS, hashed)                        | **Never**                                                      |
| Asked when        | At sign-in (every 7 days)                  | Once per browser tab session                                   |

## Tech

- **React 19** + **TypeScript 6** (strict mode, no `any`, no `console.log`)
- **Vite 8** for build & dev
- **Tailwind CSS 4** (via `@tailwindcss/vite` plugin) for styling
- **TipTap 3** for the rich-text notes editor
- **Firebase 12** Auth + Firestore (lazy-loaded into separate chunks)
- Native **Web Crypto API** for AES-GCM + PBKDF2 (no extra crypto dependencies)
- **LocalStorage** (encrypted blob cache + session metadata) + **IndexedDB** (non-extractable derived key cache)
- **ESLint 10 flat config** + **Prettier 3** + **EditorConfig**
- **Husky + lint-staged** pre-commit hook auto-formats staged files
- **GitHub Actions CI** (format check + lint + typecheck + build on Node 24)
- **Root ErrorBoundary** so a single render error never takes down the whole app

## Local development

Requires **Node 24+** and **npm 11+** (see `.nvmrc` and `engines` in `package.json`). Run:

```bash
nvm use            # picks Node 24
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

### Available scripts

| Script                 | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server with HMR                          |
| `npm run build`        | Type-check + build a production bundle into `dist/`         |
| `npm run preview`      | Serve the production bundle locally                         |
| `npm run typecheck`    | TypeScript project-wide type check                          |
| `npm run lint`         | ESLint (TypeScript + React Hooks + React Refresh)           |
| `npm run lint:fix`     | Same as `lint`, with auto-fix                               |
| `npm run format`       | Prettier write all supported files                          |
| `npm run format:check` | Prettier check (used in CI)                                 |
| `npm run check`        | `typecheck` + `lint` + `format:check` (full local pre-push) |
| `npm run clean`        | Remove `dist/` and tooling caches                           |

Firebase is required for the app to function. Follow the setup below before running.

## Firebase setup (free Spark plan)

### 1. Create a free Firebase project

1. Go to https://console.firebase.google.com - **Add project**. Disable Google Analytics (not needed).
2. In the left sidebar, find **Authentication** (under **Security** in the new console). Click **Get started**.
3. **Sign-in method** tab -> enable **Email/Password** -> Save.
4. **Sign-in method** tab -> enable **Google** -> set support email -> Save.
5. In the left sidebar, find **Firestore Database** (under **Databases & Storage** in the new console). Click **Create database**:
   - Mode: **Production**.
   - Location: pick the region closest to you. **Cannot be changed later.**
6. **Firestore -> Rules** tab: paste the contents of `firestore.rules` (in this repo) and **Publish**.
7. **Project settings (gear icon) -> General -> Your apps -> Web (`</>`) -> Register app** (no hosting). Firebase shows the web config - copy these values.

### 2. Add Firebase config to environment

Create a `.env.local` file in the project root (or paste these into Netlify's environment variables):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
```

These keys are **public by design** - the Firebase web config is shipped to every browser that loads your site. Access control is enforced by the Firestore Security Rules you published in step 1 (so user A's JWT cannot read user B's row).

### 3. Authorize your Netlify domain

In Firebase Console -> **Authentication -> Settings -> Authorized domains** -> Add your Netlify URL (e.g. `credential-manager.netlify.app`). Otherwise sign-in will fail in production.

### 4. Use it

1. Run / deploy the app.
2. **Sign-in screen** appears. Choose:
   - **Continue with Google** -> Google popup -> done.
   - **Email + password** -> Create account -> done.
3. **Master password screen** appears.
   - First time: pick a strong master password (min 8 chars) - this is what encrypts your vault.
   - Returning: enter your master password to unlock.
4. **Dashboard** appears. Add credentials, search, filter, copy, export.
5. Same account on another browser/device -> sign in -> enter the same master password -> your vault decrypts.

### Sessions and locking

- Sign-in (Firebase) session lasts 7 days. Expiry is shown in the user menu (top-right).
- **Remember on this device** on the master password screen lets you pick how long the unlocked state survives a refresh / browser restart:
  - _Don't remember_ (default): asked on every refresh - most secure
  - 1 hour / 1 day / 7 days / 30 days: the _derived AES key_ (not the password) is stored as a non-extractable `CryptoKey` in IndexedDB; the raw key material is unreadable even via DevTools
- Anyone with access to your unlocked browser profile during the remembered period can decrypt the vault, just like any other password manager's "unlocked" state.
- **Lock vault now** in the user menu wipes both the in-memory key and the IndexedDB cache immediately - useful when stepping away from the computer.
- **Sign out** ends every layer (Firebase session + master password cache); you'll need to sign in AND enter the master password again next time.

### Backup and recovery

- Click **Export** to download an encrypted JSON file of your vault. This file can only be decrypted with the master password that was active when you exported it.
- Store the exported file somewhere safe (cloud drive, USB). Without it, if you forget your master password, your data is permanently lost.
- To restore on a new device/account: sign in (creating a new Firebase account if needed) -> set a new master password -> click **Import** -> paste/select the file -> enter the master password the file was originally encrypted with.

## Production build

```bash
npm run build
npm run preview   # to preview the production build locally
```

The build is emitted to `dist/`.

## Deploy to Netlify (free)

The repo is preconfigured for Netlify via `netlify.toml`.

### Option A - Connect your Git repo (recommended)

1. Push this project to GitHub / GitLab / Bitbucket.
2. Go to https://app.netlify.com - Add new site - Import an existing project.
3. Pick the repo. Netlify will read `netlify.toml` and use:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 24
4. **If you want cloud sync**: Site settings -> Build & deploy -> Environment -> add the six `VITE_FIREBASE_*` variables from your `.env.local`. Trigger a redeploy after adding them.
5. Click Deploy. Done. Every push to your default branch redeploys automatically.

### Option B - Netlify CLI (no Git push required)

```bash
npm install -g netlify-cli
netlify login
npm run build
netlify deploy --prod --dir=dist
```

### Option C - Drag & drop

1. Run `npm run build`.
2. Open https://app.netlify.com/drop and drag the `dist/` folder onto the page.

## Security notes

- **Zero-knowledge encryption.** Your master password is never transmitted anywhere. The AES-256-GCM key is derived in your browser via PBKDF2-SHA256 with 250,000 iterations and a unique per-user salt. Even Firebase admins cannot decrypt your vault.
- Authentication is required to use the app. Each user's encrypted vault lives in `vaults/{uid}` and is isolated by Firestore Security Rules (see `firestore.rules`).
- Data in transit is HTTPS. The Firestore document contains only `{ ciphertext, iv, salt, updatedAt, schemaVersion }` - never plaintext.
- The deployed site sets strict security headers (CSP, X-Frame-Options, etc.) via `netlify.toml`. The CSP allows the Firebase Auth (incl. Google popup) and Firestore endpoints needed for sync.
- Firebase config keys (the `VITE_FIREBASE_*` values) are public by design; they only identify the project. Access control comes from Firestore Rules + per-vault AES encryption.
- The master password is held only in memory (React state) for the lifetime of the browser tab. Reloading the tab requires re-entering it. There's no "Remember master password" - that's intentional.
- Firebase sessions are bounded to 7 days. Expired sessions auto-sign-out on the next app load and proactively if the tab is open at expiry.

### What if I forget my master password?

There is no recovery path - that's the cost of zero-knowledge. Your options are:

1. **Import a previous encrypted export** (and provide the master password it was created with).
2. **Reset the vault** from the master password screen - permanently deletes the encrypted blob and lets you start over with a new master password. Existing credentials are gone.

## Data model

### Firestore: `vaults/{uid}`

```ts
{
  ciphertext: string; // base64 AES-256-GCM ciphertext of JSON-encoded Vault
  iv: string; // base64 12-byte IV per encryption
  salt: string; // base64 16-byte PBKDF2 salt (stable per user)
  updatedAt: number;
  schemaVersion: 2;
}
```

### Firestore: `notes/{uid}/items/{noteId}` (one document per note)

```ts
{
  ciphertext: string; // base64 AES-256-GCM ciphertext of JSON-encoded NoteEntry
  iv: string; // base64 12-byte IV per encryption
  updatedAt: number;
  schemaVersion: 1;
}
```

The `salt` is shared from the vault document, so one master password unlocks both. Notes can be up to ~750 KB of plaintext each; total count is bounded only by your Firestore quota.

### Firestore: `users/{uid}`

```ts
{
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: number;
  lastLoginAt: number;
  // plus server timestamps: createdServerAt, lastLoginServerAt
}
```

### Each credential entry

```ts
interface CredentialEntry {
  id: string;
  app: string;
  environment: string;
  url?: string;
  username?: string;
  email?: string;
  password?: string;
  role?: string;
  tags?: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

## Project structure

```
src/
├── App.tsx                  # Top-level shell: bootstrap + state orchestration
├── main.tsx                 # React root + StrictMode
├── index.css                # Tailwind v4 layer + prose-editor styles
├── types.ts                 # Domain types (CredentialEntry, NoteEntry, etc.)
├── lib/                     # Pure data layer - no React
│   ├── backup.ts            # Encrypted import/export envelope + merge logic
│   ├── clipboard.ts         # Secure-context clipboard fallback
│   ├── constants.ts         # Storage keys, sentinels, TTL, Firestore paths
│   ├── crypto.ts            # CSPRNG password generator
│   ├── cryptoZK.ts          # AES-GCM-256 + PBKDF2 (Web Crypto API)
│   ├── envColor.ts          # Env name -> Tailwind chip color
│   ├── firebase.ts          # Lazy-init Firebase + auth-error translator
│   ├── id.ts                # randomUUID with fallback
│   ├── keyCache.ts          # IndexedDB non-extractable CryptoKey cache
│   ├── passwordStrength.ts  # Master password strength scoring
│   ├── storage.ts           # LocalStorage encrypted blob cache + session
│   ├── sync.ts              # Firestore vault + notes + user-profile sync
│   └── views.ts             # AppView union
└── components/              # All React UI
    ├── AppHeader.tsx        # Sticky header with brand, tabs, user menu
    ├── AuthProvider.tsx     # Firebase Auth context + 7-day session
    ├── CenteredSpinner.tsx
    ├── ConfirmModal.tsx     # Generic destructive/info confirm dialog
    ├── CredentialCard.tsx
    ├── CredentialForm.tsx
    ├── CredentialsView.tsx  # Search/filter + grouped card grid
    ├── DeleteAccountModal.tsx # Account deletion confirmation flow
    ├── EmptyState.tsx       # Shared empty-state card (3 views use it)
    ├── ErrorBoundary.tsx    # Root error boundary
    ├── Icon.tsx             # All SVG icons
    ├── ImportModal.tsx
    ├── MasterPasswordScreen.tsx
    ├── Modal.tsx            # Base modal with focus & scroll lock
    ├── NotesView.tsx        # Notes list + selected-note editor
    ├── PasswordStrengthMeter.tsx # Visual strength meter for master pwd
    ├── RichEditor.tsx       # TipTap toolbar + editor + status bar
    ├── SignInScreen.tsx
    ├── SyncStatus.tsx
    ├── TabButton.tsx
    ├── TabRefreshOverlay.tsx # Overlay while a tab's data reloads
    ├── Theme.tsx            # Theme context + system-preference sync
    ├── ThemeToggle.tsx
    ├── Toast.tsx            # Toast provider + promise() helper
    ├── UrlForm.tsx
    ├── UrlsView.tsx         # App x Variant x Environment URL matrix
    └── UserMenu.tsx         # Avatar dropdown (import/export/lock/signout)
```

Conventions:

- `lib/` is **pure TypeScript** - no React imports - so it can be unit-tested in isolation.
- `components/` may import from `lib/` and other components, never the other way around.
- All persistent state lives behind helpers in `lib/storage.ts`, `lib/keyCache.ts`, or `lib/sync.ts`. There are **no direct `localStorage`/`indexedDB`/`firestore` calls in the component layer**.
- Storage keys, sentinel filter values (`__ALL__`, `__NO_VARIANT__`), the 7-day session TTL, and Firestore collection names are centralized in `src/lib/constants.ts`.

## License

MIT - use it however you want.
