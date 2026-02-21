# KnowUNIty 🎓

> Micro-revision before every class — powered by Gemini AI

KnowUNIty links your university calendar and sends a push notification 30 minutes before each lecture. Tap it to get an AI-generated quiz tailored to your upcoming topic.

---

## Stack

| Layer | Tech |
|-------|------|
| Mobile app | React Native + Expo (TypeScript) |
| Backend | Firebase Cloud Functions (Node.js 18, TypeScript) |
| Database | Cloud Firestore |
| Push notifications | Firebase Cloud Messaging (FCM) |
| AI | Gemini 2.0 Flash (server-side only) |
| Calendar | iCal URL parsing (+ Google Calendar OAuth ready) |

---

## Project Structure

```
knowUNIty/
├── app/                    # Expo React Native app
│   ├── src/
│   │   ├── screens/        # 8 screens
│   │   ├── services/       # firebase, auth, api, notifications
│   │   ├── navigation/     # RootNavigator with deep links
│   │   ├── constants/      # theme tokens
│   │   └── types/          # shared TypeScript types
│   ├── App.tsx
│   ├── app.json
│   └── package.json
├── functions/              # Firebase Cloud Functions
│   └── src/
│       ├── calendar/       # iCal ingestion
│       ├── quiz/           # Gemini quiz generation + submit
│       ├── doubt/          # Gemini Q&A follow-ups
│       ├── notifications/  # 5-min scheduler → FCM
│       ├── events/         # GET /events/next
│       └── index.ts        # Express app + auth middleware
├── firestore.rules
├── firestore.indexes.json
└── firebase.json
```

---

## Setup (First time)

### Prerequisites
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Expo CLI: `npm install -g expo-cli`
- Java 11+ (for Android emulator)

### 1. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com) → **Create project**
2. Enable **Authentication** → Email/Password + Google
3. Enable **Cloud Firestore** (production mode, then apply rules below)
4. Enable **Cloud Messaging** (FCM)

### 2. Clone & configure

```bash
git clone <repo>
cd knowUNIty

# Link Firebase project
firebase login
firebase use --add   # select your project
```

### 3. App environment variables

```bash
cd app
cp .env.example .env
# Fill in your Firebase config from Firebase Console → Project settings
```

### 4. Deploy Firestore rules & indexes

```bash
firebase deploy --only firestore
```

### 5. Set Cloud Functions secrets

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
```

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

### 6. Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

After deployment, copy the function URL from the output (e.g., `https://us-central1-YOUR_PROJECT.cloudfunctions.net/api`) and set it in `app/.env`:
```
EXPO_PUBLIC_API_BASE_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net/api
```

### 7. Run the Expo app

```bash
cd app
npm install
npx expo start
```

Scan the QR code with **Expo Go** or press `i` for iOS simulator / `a` for Android.

---

## 2-Minute Demo Script 🎬

### Setup (1 min before demo)

**Seed a test event** — run this in Firebase Console → Firestore → add a document manually to `events/`:
```json
{
  "userId": "<YOUR_TEST_USER_UID>",
  "eventId": "demo-event-1",
  "title": "CS2102 Databases Lecture",
  "startTime": "<NOW + 31 MINUTES as ISO string>",
  "endTime": "<NOW + 90 MINUTES as ISO string>",
  "source": "ical",
  "notifiedAt": null
}
```

Or use the helper script:
```bash
node scripts/seed-demo-event.js <USER_UID> "CS2102 Databases Lecture" 31
```

### Demo flow (2 min)

| Step | Action | What to show |
|------|--------|-------------|
| 1 | Open app | Welcome screen with animated logo |
| 2 | Sign in with email | Home screen appears with "CS2102 Databases Lecture" card |
| 3 | (Trigger scheduled function manually in Firebase Console) | Receive push notification |
| 4 | Tap notification | Deep links directly to WarmUp screen |
| 5 | Type "SQL joins, indexes, B-trees", choose Quick | Tap "Generate Quiz" |
| 6 | Answer 5 questions | Show per-answer reveal with explanation |
| 7 | See Results screen | Animated score circle |
| 8 | Go back, tap "Ask" on any question | Type "Why is a B-tree better than a hash index?" |
| 9 | Show AI chat response | End demo |

### Manually trigger notification (skip the 5-min cron)

In Firebase Console → Functions → `notificationScheduler` → **Run now**

Or temporarily set the event's `startTime` to `NOW + 30s`, the scheduler picks it up next run.

---

## API Endpoints

All endpoints require `Authorization: Bearer <Firebase ID Token>`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/calendar/connect/ical` | Connect iCal feed URL |
| `GET` | `/events/next` | Get next upcoming event |
| `POST` | `/quiz/generate` | Generate AI quiz `{topic, mode}` |
| `POST` | `/quiz/submit` | Submit answers `{quizId, answers[]}` |
| `POST` | `/doubt/ask` | Ask follow-up `{quizId, questionIndex, userQuestion}` |

---

## Deep Link Format

```
knowunity://warmup?eventId=<EVENT_ID>&eventTitle=<ENCODED_TITLE>
```

---

## Firestore Data Model

```
users/{uid}          — profile + calendarConfig + devicePushToken
events/{docId}       — userId, eventId, title, startTime, endTime, source, notifiedAt
quizzes/{docId}      — userId, topic, mode, questions[], createdAt
quizAttempts/{docId} — userId, quizId, answers[], score, createdAt
doubts/{docId}       — userId, quizId, questionIndex, thread[]
```

---

## Security Notes

- Gemini API key is **never** shipped to the client — only stored in Firebase Functions config
- All Firestore reads are user-scoped (see `firestore.rules`)
- Quiz generation is rate-limited to 10 per user per hour
- All inputs are validated and length-checked on the server
