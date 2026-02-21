import * as functions from 'firebase-functions';
import * as express from 'express';
import * as cors from 'cors';
import * as admin from 'firebase-admin';
import './config'; // Initialize firebase-admin

import calendarRouter from './calendar/ical';
import quizRouter from './quiz/index';
import doubtRouter from './doubt/index';
import eventsRouter from './events/index';
import { notificationScheduler } from './notifications/scheduler';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ─── Auth middleware ─────────────────────────────────────────────────────────
app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Skip health check
    if (req.path === '/health') return next();

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        (req as any).uid = decoded.uid;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }));
app.use('/calendar', calendarRouter);
app.use('/quiz', quizRouter);
app.use('/doubt', doubtRouter);
app.use('/events', eventsRouter);

// ─── Exports ─────────────────────────────────────────────────────────────────
export const api = functions
    .runWith({ memory: '512MB', timeoutSeconds: 60 })
    .https.onRequest(app);

export { notificationScheduler };
