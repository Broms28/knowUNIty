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
// Rate limit: max requests per user per hour
const RATE_LIMIT = 10;
// POST /quiz/generate
router.post('/generate', async (req, res) => {
    try {
        const uid = req.uid;
        const { topic, mode, eventId } = req.body;
        // Validate inputs
        if (!topic || topic.trim().length === 0) {
            res.status(400).json({ error: 'Topic is required' });
            return;
        }
        if (topic.length > 200) {
            res.status(400).json({ error: 'Topic too long (max 200 chars)' });
            return;
        }
        if (mode !== 'quick' && mode !== 'extended') {
            res.status(400).json({ error: 'Mode must be quick or extended' });
            return;
        }
        // Rate limit check
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const recentSnap = await config_1.db.collection('quizzes')
            .where('userId', '==', uid)
            .where('createdAt', '>', oneHourAgo)
            .get();
        if (recentSnap.size >= RATE_LIMIT) {
            res.status(429).json({ error: 'Rate limit exceeded. Please wait before generating more quizzes.' });
            return;
        }
        const numQuestions = mode === 'quick' ? 5 : 15;
        const prompt = `You are an educational AI for university students. Generate a ${mode} quiz about "${topic.trim()}".

Return ONLY valid JSON with no markdown, no code fences, no extra text. The response must be exactly this structure:
{
  "topic": "${topic.trim()}",
  "mode": "${mode}",
  "questions": [
    {
      "question": "Clear, specific question appropriate for a university student",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctIndex": 0,
      "explanation": "One to two sentences explaining why this is correct and why the others are wrong."
    }
  ]
}

Rules:
- Generate exactly ${numQuestions} questions
- correctIndex is 0-3 (zero-based index into options array)
- Questions should test understanding, not memorization
- Do not hallucinate course-specific details not provided
- Keep questions clear and unambiguous
- Vary difficulty from recall to application
- Return ONLY the JSON object, nothing else`;
        const genAI = getGemini();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        // Parse and validate JSON
        let quizData;
        try {
            quizData = JSON.parse(text);
        }
        catch (_a) {
            // Try to extract JSON if wrapped in anything
            const match = text.match(/\{[\s\S]*\}/);
            if (!match)
                throw new Error('Invalid JSON from Gemini');
            quizData = JSON.parse(match[0]);
        }
        if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
            throw new Error('Invalid quiz structure');
        }
        // Validate questions
        const validatedQuestions = quizData.questions.slice(0, numQuestions).map((q) => ({
            question: String(q.question || ''),
            options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
            correctIndex: Math.max(0, Math.min(3, Number(q.correctIndex) || 0)),
            explanation: String(q.explanation || ''),
        }));
        // Store in Firestore
        const quizRef = config_1.db.collection('quizzes').doc();
        const quiz = {
            id: quizRef.id,
            userId: uid,
            eventId: eventId || null,
            topic: topic.trim(),
            mode,
            createdAt: new Date().toISOString(),
            questions: validatedQuestions,
        };
        await quizRef.set(quiz);
        res.json({ success: true, quiz });
    }
    catch (err) {
        functions.logger.error('Quiz generation error:', err);
        res.status(500).json({ error: err.message || 'Failed to generate quiz' });
    }
});
// POST /quiz/submit
router.post('/submit', async (req, res) => {
    try {
        const uid = req.uid;
        const { quizId, answers } = req.body;
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
        let score = 0;
        const feedback = questions.map((q, i) => {
            const isCorrect = answers[i] === q.correctIndex;
            if (isCorrect)
                score++;
            return { isCorrect, correctIndex: q.correctIndex, selectedIndex: answers[i] };
        });
        // Store attempt
        const attemptRef = config_1.db.collection('quizAttempts').doc();
        await attemptRef.set({
            id: attemptRef.id,
            userId: uid,
            quizId,
            answers,
            score,
            total: questions.length,
            feedback,
            createdAt: new Date().toISOString(),
        });
        res.json({ success: true, score, total: questions.length, feedback });
    }
    catch (err) {
        functions.logger.error('Quiz submit error:', err);
        res.status(500).json({ error: err.message || 'Failed to submit quiz' });
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map