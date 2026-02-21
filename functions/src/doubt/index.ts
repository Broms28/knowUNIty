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

// POST /doubt/ask
router.post('/ask', async (req: express.Request, res: express.Response) => {
    try {
        const uid = (req as any).uid as string;
        const { quizId, questionIndex, userQuestion } = req.body as {
            quizId: string;
            questionIndex: number;
            userQuestion: string;
        };

        if (!userQuestion || userQuestion.trim().length === 0) {
            res.status(400).json({ error: 'Question is required' });
            return;
        }
        if (userQuestion.length > 500) {
            res.status(400).json({ error: 'Question too long (max 500 chars)' });
            return;
        }

        // Get the original quiz question for context
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

        const questions = quiz.questions as Array<{
            question: string;
            options: string[];
            correctIndex: number;
            explanation: string;
        }>;

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
        const doubtQuery = await db.collection('doubts')
            .where('userId', '==', uid)
            .where('quizId', '==', quizId)
            .where('questionIndex', '==', questionIndex)
            .limit(1)
            .get();

        const userMsg = { role: 'user', content: userQuestion.trim(), timestamp: new Date().toISOString() };
        const aiMsg = { role: 'assistant', content: answer, timestamp: new Date().toISOString() };

        if (doubtQuery.empty) {
            await db.collection('doubts').doc().set({
                userId: uid,
                quizId,
                questionIndex,
                thread: [userMsg, aiMsg],
                createdAt: new Date().toISOString(),
            });
        } else {
            const existingDoc = doubtQuery.docs[0];
            const existingThread = (existingDoc.data().thread as any[]) || [];
            await existingDoc.ref.update({
                thread: [...existingThread, userMsg, aiMsg],
            });
        }

        res.json({ success: true, answer });
    } catch (err: any) {
        functions.logger.error('Doubt ask error:', err);
        res.status(500).json({ error: err.message || 'Failed to get answer' });
    }
});

export default router;
