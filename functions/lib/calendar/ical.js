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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("../config");
const node_fetch_1 = __importDefault(require("node-fetch"));
const ICAL = require("ical.js");
const router = express_1.default.Router();
router.use((0, cors_1.default)({ origin: true }));
// POST /calendar/connect/ical
router.post('/connect/ical', async (req, res) => {
    var _a, _b, _c;
    try {
        const uid = req.uid;
        const { icalUrl } = req.body;
        if (!icalUrl || !icalUrl.startsWith('http')) {
            res.status(400).json({ error: 'Invalid iCal URL' });
            return;
        }
        // Fetch iCal data
        const response = await (0, node_fetch_1.default)(icalUrl, { timeout: 10000 });
        if (!response.ok)
            throw new Error(`Failed to fetch iCal: ${response.status}`);
        const text = await response.text();
        // Parse with ical.js
        const jcal = ICAL.parse(text);
        const comp = new ICAL.Component(jcal);
        const vevents = comp.getAllSubcomponents('vevent');
        const now = new Date();
        const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
        const batch = config_1.db.batch();
        let count = 0;
        for (const vevent of vevents) {
            const event = new ICAL.Event(vevent);
            const dtstart = (_a = event.startDate) === null || _a === void 0 ? void 0 : _a.toJSDate();
            if (!dtstart || dtstart < now || dtstart > cutoff)
                continue;
            const eventId = event.uid || `${uid}-${dtstart.getTime()}`;
            const docRef = config_1.db.collection('events').doc(`${uid}_${eventId}`);
            batch.set(docRef, {
                userId: uid,
                eventId,
                title: event.summary || 'Untitled Event',
                startTime: dtstart.toISOString(),
                endTime: ((_c = (_b = event.endDate) === null || _b === void 0 ? void 0 : _b.toJSDate()) === null || _c === void 0 ? void 0 : _c.toISOString()) || dtstart.toISOString(),
                source: 'ical',
                notifiedAt: null,
                createdAt: new Date().toISOString(),
            }, { merge: true });
            count++;
            if (count >= 50)
                break; // Cap at 50 events
        }
        await batch.commit();
        // Update user
        await config_1.db.collection('users').doc(uid).update({
            calendarType: 'ical',
            'calendarConfig.icalUrl': icalUrl,
        });
        res.json({ success: true, eventsImported: count });
    }
    catch (err) {
        functions.logger.error('iCal connect error:', err);
        res.status(500).json({ error: err.message || 'Failed to connect iCal' });
    }
});
exports.default = router;
//# sourceMappingURL=ical.js.map