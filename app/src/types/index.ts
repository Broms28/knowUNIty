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
    SignIn: undefined;
    CalendarConnect: undefined;
    Home: undefined;
    WarmUp: { eventId?: string; eventTitle?: string };
    Quiz: { topic: string; mode: 'quick' | 'extended'; eventId?: string };
    Results: { quizId: string; score: number; total: number };
    Doubts: { quizId: string; questionIndex: number; question: string };
};
