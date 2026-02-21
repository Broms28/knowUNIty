"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationScheduler = void 0;
const functions = __importStar(require("firebase-functions"));
const config_1 = require("../config");
// Keywords that identify class-like events
const CLASS_KEYWORDS = [
    'lecture', 'tutorial', 'seminar', 'lab', 'laboratory',
    'class', 'workshop', 'recitation', 'module', 'practical',
    'lec', 'tut', 'sem',
];
function isClassEvent(title) {
    const lower = title.toLowerCase();
    return CLASS_KEYWORDS.some((kw) => lower.includes(kw));
}
// Scheduled every 5 minutes
exports.notificationScheduler = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async () => {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 25 * 60 * 1000); // 25 min from now
    const windowEnd = new Date(now.getTime() + 35 * 60 * 1000); // 35 min from now
    functions.logger.info(`Scanning for events between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);
    // Find events in the 30-min window that haven't been notified
    const eventsSnap = await config_1.db.collection('events')
        .where('startTime', '>=', windowStart.toISOString())
        .where('startTime', '<=', windowEnd.toISOString())
        .where('notifiedAt', '==', null)
        .get();
    if (eventsSnap.empty) {
        functions.logger.info('No events to notify about');
        return null;
    }
    const batch = config_1.db.batch();
    const notifications = [];
    for (const eventDoc of eventsSnap.docs) {
        const event = eventDoc.data();
        if (!isClassEvent(event.title))
            continue;
        // Get user's push token
        const userSnap = await config_1.db.collection('users').doc(event.userId).get();
        if (!userSnap.exists)
            continue;
        const user = userSnap.data();
        const pushToken = user.devicePushToken;
        if (!pushToken)
            continue;
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
                priority: 'high',
                notification: {
                    channelId: 'default',
                    priority: 'high',
                },
            },
        };
        notifications.push(config_1.messaging.send(message).catch((err) => {
            functions.logger.error(`Failed to send notification to ${event.userId}:`, err);
        }));
        // Mark as notified
        batch.update(eventDoc.ref, { notifiedAt: now.toISOString() });
        functions.logger.info(`Queued notification for user ${event.userId}, event: ${event.title}`);
    }
    await Promise.all(notifications);
    await batch.commit();
    functions.logger.info(`Sent ${notifications.length} notifications`);
    return null;
});
//# sourceMappingURL=scheduler.js.map