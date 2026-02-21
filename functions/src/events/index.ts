import * as express from 'express';
import * as cors from 'cors';
import * as functions from 'firebase-functions';
import { db } from '../config';

const router = express.Router();
router.use(cors({ origin: true }));

// GET /events/next
router.get('/next', async (req: express.Request, res: express.Response) => {
    try {
        const uid = (req as any).uid as string;
        const now = new Date().toISOString();

        const snap = await db.collection('events')
            .where('userId', '==', uid)
            .where('startTime', '>', now)
            .orderBy('startTime', 'asc')
            .limit(1)
            .get();

        if (snap.empty) {
            res.json({ event: null });
            return;
        }

        res.json({ event: snap.docs[0].data() });
    } catch (err: any) {
        functions.logger.error('Events next error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
