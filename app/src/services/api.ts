import axios from 'axios';
import { auth } from './firebase';
import { DoubtMessage, QuizHistoryItem, QuizReviewPayload, QuizReviewSummary } from '../types';

// Base URL for Firebase Cloud Functions
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api';

const getAuthHeader = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
};

export const connectIcal = async (icalUrl: string) => {
    const headers = await getAuthHeader();
    const res = await axios.post(`${BASE_URL}/calendar/connect/ical`, { icalUrl }, { headers });
    return res.data;
};

export const connectGoogle = async (code: string) => {
    const headers = await getAuthHeader();
    const res = await axios.post(`${BASE_URL}/calendar/connect/google`, { code }, { headers });
    return res.data;
};

export const getNextEvent = async (forceSync = false) => {
    const headers = await getAuthHeader();
    const res = await axios.get(`${BASE_URL}/events/next`, {
        headers,
        params: forceSync ? { forceSync: '1' } : undefined,
    });
    return res.data;
};

export const generateQuiz = async (topic: string, mode: 'quick' | 'extended', eventId?: string) => {
    const headers = await getAuthHeader();
    const res = await axios.post(
        `${BASE_URL}/quiz/generate`,
        { topic, mode, eventId },
        { headers }
    );
    return res.data;
};

export const submitQuiz = async (quizId: string, answers: number[]) => {
    const headers = await getAuthHeader();
    const res = await axios.post(`${BASE_URL}/quiz/submit`, { quizId, answers }, { headers });
    return res.data;
};

export const askDoubt = async (quizId: string, questionIndex: number, userQuestion: string) => {
    const headers = await getAuthHeader();
    const res = await axios.post(
        `${BASE_URL}/doubt/ask`,
        { quizId, questionIndex, userQuestion },
        { headers }
    );
    return res.data;
};

export const getDoubtThread = async (quizId: string, questionIndex: number): Promise<{ thread: DoubtMessage[] }> => {
    const headers = await getAuthHeader();
    const res = await axios.get(`${BASE_URL}/doubt/thread`, {
        headers,
        params: { quizId, questionIndex },
    });
    return res.data;
};

export const getQuizHistory = async (limit = 50): Promise<{ history: QuizHistoryItem[] }> => {
    const headers = await getAuthHeader();
    const res = await axios.get(`${BASE_URL}/quiz/history`, {
        headers,
        params: { limit },
    });
    return res.data;
};

export const getLatestQuizReview = async (): Promise<{ review: QuizReviewSummary | null }> => {
    const headers = await getAuthHeader();
    const res = await axios.get(`${BASE_URL}/quiz/review/latest`, { headers });
    return res.data;
};

export const getQuizReview = async (quizId: string): Promise<QuizReviewPayload> => {
    const headers = await getAuthHeader();
    const res = await axios.get(`${BASE_URL}/quiz/review/${encodeURIComponent(quizId)}`, { headers });
    return res.data;
};

export const getNotificationStatus = async (): Promise<{
    notifications: {
        enabled: boolean;
        tokenType: 'expo' | 'fcm' | null;
        tokenMasked: string | null;
        upcomingEventsCount: number;
        pendingNotificationsCount: number;
        lastTestSentAt: string | null;
        lastTestStatus: string | null;
        lastTestError: string | null;
        lastTestReceiptStatus: string | null;
        lastTestReceiptError: string | null;
    };
}> => {
    const headers = await getAuthHeader();
    const res = await axios.get(`${BASE_URL}/notifications/status`, { headers });
    return res.data;
};

export const sendTestNotification = async (message?: string): Promise<{
    success: boolean;
    channel: 'expo' | 'fcm';
    ticketId?: string | null;
    receiptStatus?: 'ok' | 'error' | 'pending' | null;
    receiptError?: string | null;
}> => {
    const headers = await getAuthHeader();
    const res = await axios.post(
        `${BASE_URL}/notifications/test`,
        { message },
        { headers }
    );
    return res.data;
};
