import express from 'express';
import cors from 'cors';
import * as functions from 'firebase-functions';
import { db } from '../config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
router.use(cors({ origin: true }));

const getGemini = () => {
    const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    return new GoogleGenerativeAI(apiKey);
};

// Rate limit: max requests per user per hour
const RATE_LIMIT = 10;

// POST /quiz/generate
router.post('/generate', async (req: express.Request, res: express.Response) => {
    try {
        const uid = (req as any).uid as string;
        const { topic, mode, eventId } = req.body as {
            topic: string;
            mode: 'quick' | 'extended';
            eventId?: string;
        };

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
        const recentSnap = await db.collection('quizzes')
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
        let quizData: any;
        try {
            quizData = JSON.parse(text);
        } catch {
            // Try to extract JSON if wrapped in anything
            const match = text.match(/\{[\s\S]*\}/);
            if (!match) throw new Error('Invalid JSON from Gemini');
            quizData = JSON.parse(match[0]);
        }

        if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
            throw new Error('Invalid quiz structure');
        }

        // Validate questions
        const validatedQuestions = quizData.questions.slice(0, numQuestions).map((q: any) => ({
            question: String(q.question || ''),
            options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
            correctIndex: Math.max(0, Math.min(3, Number(q.correctIndex) || 0)),
            explanation: String(q.explanation || ''),
        }));

        // Store in Firestore
        const quizRef = db.collection('quizzes').doc();
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
    } catch (err: any) {
        functions.logger.error('Quiz generation error:', err);
        res.status(500).json({ error: err.message || 'Failed to generate quiz' });
    }
});

// POST /quiz/submit
router.post('/submit', async (req: express.Request, res: express.Response) => {
    try {
        const uid = (req as any).uid as string;
        const { quizId, answers } = req.body as { quizId: string; answers: number[] };

        const quizSnap = await db.collection('quizzes').doc(quizId).get();
        if (!quizSnap.exists) {
            res.status(404).json({ error: 'Quiz not found' });
            return;
        }
        const quiz = quizSnap.data()!;

        if (quiz.userId !== uid) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const questions = quiz.questions as Array<{ correctIndex: number }>;
        let score = 0;
        const feedback = questions.map((q, i) => {
            const isCorrect = answers[i] === q.correctIndex;
            if (isCorrect) score++;
            return { isCorrect, correctIndex: q.correctIndex, selectedIndex: answers[i] };
        });

        // Store attempt
        const attemptRef = db.collection('quizAttempts').doc();
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
    } catch (err: any) {
        functions.logger.error('Quiz submit error:', err);
        res.status(500).json({ error: err.message || 'Failed to submit quiz' });
    }
});

export default router;
