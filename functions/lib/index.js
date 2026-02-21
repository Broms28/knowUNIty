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
exports.notificationScheduler = exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const express = __importStar(require("express"));
const cors = __importStar(require("cors"));
const admin = __importStar(require("firebase-admin"));
require("./config"); // Initialize firebase-admin
const ical_1 = __importDefault(require("./calendar/ical"));
const index_1 = __importDefault(require("./quiz/index"));
const index_2 = __importDefault(require("./doubt/index"));
const index_3 = __importDefault(require("./events/index"));
const scheduler_1 = require("./notifications/scheduler");
Object.defineProperty(exports, "notificationScheduler", { enumerable: true, get: function () { return scheduler_1.notificationScheduler; } });
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
// ─── Auth middleware ─────────────────────────────────────────────────────────
app.use(async (req, res, next) => {
    // Skip health check
    if (req.path === '/health')
        return next();
    const authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        req.uid = decoded.uid;
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});
// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }));
app.use('/calendar', ical_1.default);
app.use('/quiz', index_1.default);
app.use('/doubt', index_2.default);
app.use('/events', index_3.default);
// ─── Exports ─────────────────────────────────────────────────────────────────
exports.api = functions
    .runWith({ memory: '512MB', timeoutSeconds: 60 })
    .https.onRequest(app);
//# sourceMappingURL=index.js.map