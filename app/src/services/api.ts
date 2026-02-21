import axios from 'axios';
import { auth } from './firebase';

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

export const getNextEvent = async () => {
    const headers = await getAuthHeader();
    const res = await axios.get(`${BASE_URL}/events/next`, { headers });
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
