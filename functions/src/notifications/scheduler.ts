import * as functions from 'firebase-functions';
import { db, messaging } from '../config';

// Keywords that identify class-like events
const CLASS_KEYWORDS = [
    'lecture', 'tutorial', 'seminar', 'lab', 'laboratory',
    'class', 'workshop', 'recitation', 'module', 'practical',
    'lec', 'tut', 'sem',
];

function isClassEvent(title: string): boolean {
    const lower = title.toLowerCase();
    return CLASS_KEYWORDS.some((kw) => lower.includes(kw));
}

// Scheduled every 5 minutes
export const notificationScheduler = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async () => {
        const now = new Date();
        const windowStart = new Date(now.getTime() + 25 * 60 * 1000); // 25 min from now
        const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);   // 35 min from now

        functions.logger.info(
            `Scanning for events between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`
        );

        // Find events in the 30-min window that haven't been notified
        const eventsSnap = await db.collection('events')
            .where('startTime', '>=', windowStart.toISOString())
            .where('startTime', '<=', windowEnd.toISOString())
            .where('notifiedAt', '==', null)
            .get();

        if (eventsSnap.empty) {
            functions.logger.info('No events to notify about');
            return null;
        }

        const batch = db.batch();
        const notifications: Promise<any>[] = [];

        for (const eventDoc of eventsSnap.docs) {
            const event = eventDoc.data();
            if (!isClassEvent(event.title)) continue;

            // Get user's push token
            const userSnap = await db.collection('users').doc(event.userId).get();
            if (!userSnap.exists) continue;

            const user = userSnap.data()!;
            const pushToken = user.devicePushToken as string | null;
            if (!pushToken) continue;

            const firstName = (user.name || user.email || 'there').split(' ')[0];
            const startTime = new Date(event.startTime);
            const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Send FCM notification
            const message = {
                token: pushToken,
                notification: {
                    title: `${firstName}, class in 30 minutes! 🎓`,
                    body: `${event.title} at ${timeStr}. Quick warm-up? Tap to start →`,
                },
                data: {
                    url: `knowunity://warmup?eventId=${event.eventId}&eventTitle=${encodeURIComponent(event.title)}`,
                    eventId: event.eventId,
                    eventTitle: event.title,
                },
                apns: {
                    payload: {
                        aps: {
                            badge: 1,
                            sound: 'default',
                        },
                    },
                },
                android: {
                    priority: 'high' as const,
                    notification: {
                        channelId: 'default',
                        priority: 'high' as const,
                    },
                },
            };

            notifications.push(
                messaging.send(message).catch((err) => {
                    functions.logger.error(`Failed to send notification to ${event.userId}:`, err);
                })
            );

            // Mark as notified
            batch.update(eventDoc.ref, { notifiedAt: now.toISOString() });

            functions.logger.info(`Queued notification for user ${event.userId}, event: ${event.title}`);
        }

        await Promise.all(notifications);
        await batch.commit();

        functions.logger.info(`Sent ${notifications.length} notifications`);
        return null;
    });
