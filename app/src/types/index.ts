// Types shared across the app
export interface User {
    id: string;
    name: string;
    email: string;
    calendarType: 'ical' | 'google' | null;
    calendarConfig: {
        icalUrl?: string;
        googleAccessToken?: string;
        googleRefreshToken?: string;
    };
    devicePushToken: string | null;
}

export interface CalendarEvent {
    id: string;
    userId: string;
    eventId: string;
    title: string;
    startTime: string; // ISO string
    endTime: string;
    source: 'ical' | 'google';
    notifiedAt: string | null;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export interface Quiz {
    id: string;
    userId: string;
    eventId?: string;
    topic: string;
    mode: 'quick' | 'extended';
    createdAt: string;
    questions: QuizQuestion[];
}

export interface QuizAttempt {
    id: string;
    userId: string;
    quizId: string;
    answers: number[];
    score: number;
    createdAt: string;
}

export interface QuizReviewSummary {
    quizId: string;
    topic: string;
    mode: 'quick' | 'extended';
    score: number;
    total: number;
    completedAt: string;
    eventId?: string | null;
}

export interface QuizReviewPayload {
    review: {
        quiz: Quiz & {
            completedAt?: string;
            eventId?: string | null;
        };
        attempt: {
            id: string;
            score: number;
            total: number;
            answers: number[];
            createdAt: string;
            feedback: Array<{
                isCorrect: boolean;
                correctIndex: number;
                selectedIndex: number;
            }>;
        } | null;
    };
}

export interface DoubtMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface Doubt {
    id: string;
    userId: string;
    quizId: string;
    questionIndex: number;
    thread: DoubtMessage[];
}

export type RootStackParamList = {
    Welcome: undefined;
    SignIn: { initialMode?: 'signin' | 'signup' } | undefined;
    CalendarConnect: undefined;
    Home: undefined;
    Account: { suggestedName?: string } | undefined;
    WarmUp: { eventId?: string; eventTitle?: string };
    Quiz: { topic: string; mode: 'quick' | 'extended'; eventId?: string };
    Results: { quizId: string; score: number; total: number };
    QuizReview: { quizId: string };
    Doubts: { quizId: string; questionIndex: number; question: string };
};
