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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const functions = __importStar(require("firebase-functions"));
const config_1 = require("../config");
const generative_ai_1 = require("@google/generative-ai");
const router = express_1.default.Router();
router.use((0, cors_1.default)({ origin: true }));
const getGemini = () => {
    var _a;
    const apiKey = process.env.GEMINI_API_KEY || ((_a = functions.config().gemini) === null || _a === void 0 ? void 0 : _a.api_key);
    if (!apiKey)
        throw new Error('GEMINI_API_KEY not configured');
    return new generative_ai_1.GoogleGenerativeAI(apiKey);
};
// POST /doubt/ask
router.post('/ask', async (req, res) => {
    try {
        const uid = req.uid;
        const { quizId, questionIndex, userQuestion } = req.body;
        if (!userQuestion || userQuestion.trim().length === 0) {
            res.status(400).json({ error: 'Question is required' });
            return;
        }
        if (userQuestion.length > 500) {
            res.status(400).json({ error: 'Question too long (max 500 chars)' });
            return;
        }
        // Get the original quiz question for context
        const quizSnap = await config_1.db.collection('quizzes').doc(quizId).get();
        if (!quizSnap.exists) {
            res.status(404).json({ error: 'Quiz not found' });
            return;
        }
        const quiz = quizSnap.data();
        if (quiz.userId !== uid) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const questions = quiz.questions;
        const q = questions[questionIndex];
        if (!q) {
            res.status(400).json({ error: 'Invalid question index' });
            return;
        }
        const prompt = `You are a helpful university tutor. A student is reviewing a quiz question and needs clarification.

Quiz Topic: ${quiz.topic}

Question: ${q.question}
Options:
${q.options.map((o, i) => `${['A', 'B', 'C', 'D'][i]}. ${o}`).join('\n')}
Correct Answer: ${['A', 'B', 'C', 'D'][q.correctIndex]}. ${q.options[q.correctIndex]}
Explanation: ${q.explanation}

Student's follow-up question: "${userQuestion.trim()}"

Respond helpfully and concisely (2-4 sentences max). Be encouraging. Don't repeat the full question back.`;
        const genAI = getGemini();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const answer = result.response.text().trim();
        // Store/update doubt thread in Firestore
        const doubtQuery = await config_1.db.collection('doubts')
            .where('userId', '==', uid)
            .where('quizId', '==', quizId)
            .where('questionIndex', '==', questionIndex)
            .limit(1)
            .get();
        const userMsg = { role: 'user', content: userQuestion.trim(), timestamp: new Date().toISOString() };
        const aiMsg = { role: 'assistant', content: answer, timestamp: new Date().toISOString() };
        if (doubtQuery.empty) {
            await config_1.db.collection('doubts').doc().set({
                userId: uid,
                quizId,
                questionIndex,
                thread: [userMsg, aiMsg],
                createdAt: new Date().toISOString(),
            });
        }
        else {
            const existingDoc = doubtQuery.docs[0];
            const existingThread = existingDoc.data().thread || [];
            await existingDoc.ref.update({
                thread: [...existingThread, userMsg, aiMsg],
            });
        }
        res.json({ success: true, answer });
    }
    catch (err) {
        functions.logger.error('Doubt ask error:', err);
        res.status(500).json({ error: err.message || 'Failed to get answer' });
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map