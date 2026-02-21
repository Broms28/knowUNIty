import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { db } from '../config';
import fetch from 'node-fetch';
import ICAL = require('ical.js');

const router = express.Router();
router.use(cors({ origin: true }));

// POST /calendar/connect/ical
router.post('/connect/ical', async (req: express.Request, res: express.Response) => {
    try {
        const uid = (req as any).uid as string;
        const { icalUrl } = req.body as { icalUrl: string };

        if (!icalUrl || !icalUrl.startsWith('http')) {
            res.status(400).json({ error: 'Invalid iCal URL' });
            return;
        }

        // Fetch iCal data
        const response = await fetch(icalUrl, { timeout: 10000 } as any);
        if (!response.ok) throw new Error(`Failed to fetch iCal: ${response.status}`);
        const text = await response.text();

        // Parse with ical.js
        const jcal = ICAL.parse(text);
        const comp = new ICAL.Component(jcal);
        const vevents = comp.getAllSubcomponents('vevent');

        const now = new Date();
        const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
        const batch = db.batch();
        let count = 0;

        for (const vevent of vevents) {
            const event = new ICAL.Event(vevent);
            const dtstart = event.startDate?.toJSDate();
            if (!dtstart || dtstart < now || dtstart > cutoff) continue;

            const eventId = event.uid || `${uid}-${dtstart.getTime()}`;
            const docRef = db.collection('events').doc(`${uid}_${eventId}`);
            batch.set(docRef, {
                userId: uid,
                eventId,
                title: event.summary || 'Untitled Event',
                startTime: dtstart.toISOString(),
                endTime: event.endDate?.toJSDate()?.toISOString() || dtstart.toISOString(),
                source: 'ical',
                notifiedAt: null,
                createdAt: new Date().toISOString(),
            }, { merge: true });

            count++;
            if (count >= 50) break; // Cap at 50 events
        }

        await batch.commit();

        // Update user
        await db.collection('users').doc(uid).update({
            calendarType: 'ical',
            'calendarConfig.icalUrl': icalUrl,
        });

        res.json({ success: true, eventsImported: count });
    } catch (err: any) {
        functions.logger.error('iCal connect error:', err);
        res.status(500).json({ error: err.message || 'Failed to connect iCal' });
    }
});

export default router;
