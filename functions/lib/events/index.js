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
const express = __importStar(require("express"));
const cors = __importStar(require("cors"));
const functions = __importStar(require("firebase-functions"));
const config_1 = require("../config");
const router = express.Router();
router.use(cors({ origin: true }));
// GET /events/next
router.get('/next', async (req, res) => {
    try {
        const uid = req.uid;
        const now = new Date().toISOString();
        const snap = await config_1.db.collection('events')
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
    }
    catch (err) {
        functions.logger.error('Events next error:', err);
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map