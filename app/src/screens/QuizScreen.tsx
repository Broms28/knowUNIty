import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, QuizQuestion } from '../types';
import { colors, spacing, radii, typography, shadows } from '../constants/theme';
import { generateQuiz, submitQuiz } from '../services/api';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Quiz'>;
    route: RouteProp<RootStackParamList, 'Quiz'>;
};

function normalizeQuestion(input: any): QuizQuestion | null {
    const question = String(input?.question || '').trim();
    const options = Array.isArray(input?.options)
        ? input.options.map((o: any) => String(o || '').trim()).filter(Boolean).slice(0, 4)
        : [];

    if (!question || options.length < 2) return null;

    let correctIndex = Number(input?.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        correctIndex = 0;
    }

    const explanation = String(input?.explanation || '').trim() || 'No explanation provided.';

    return { question, options, correctIndex, explanation };
}

export default function QuizScreen({ navigation, route }: Props) {
    const { topic, mode, eventId } = route.params;
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [quizId, setQuizId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [answers, setAnswers] = useState<number[]>([]);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        (async () => {
            try {
                const data = await generateQuiz(topic, mode, eventId);
                const rawQuestions = Array.isArray(data?.quiz?.questions) ? data.quiz.questions : [];
                const safeQuestions = rawQuestions
                    .map(normalizeQuestion)
                    .filter((q: QuizQuestion | null): q is QuizQuestion => q !== null);

                if (safeQuestions.length === 0) {
                    throw new Error('Quiz generated with no valid questions. Please try again.');
                }

                setQuestions(safeQuestions);
                setAnswers(new Array(safeQuestions.length).fill(-1));
                setQuizId(typeof data?.quiz?.id === 'string' ? data.quiz.id : null);
                if (data?.fallbackUsed || data?.generationSource === 'fallback') {
                    const reason = String(data?.fallbackReason || '').trim();
                    Alert.alert(
                        'Gemini not available',
                        reason
                            ? `Quiz used fallback generation: ${reason}`
                            : 'Quiz used fallback generation because Gemini was unavailable.'
                    );
                }
            } catch (e: any) {
                const backendError = e?.response?.data?.error;
                Alert.alert('Error', backendError || e.message || 'Failed to generate quiz', [
                    { text: 'Go back', onPress: () => navigation.goBack() },
                ]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleAnswer = (idx: number) => {
        if (revealed) return;
        setSelectedAnswer(idx);
        setRevealed(true);
    };

    const withCommittedCurrentAnswer = () => {
        const updated = [...answers];
        if (selectedAnswer !== null) {
            updated[currentIndex] = selectedAnswer;
        }
        return updated;
    };

    const animateToQuestion = (targetIndex: number, updatedAnswers: number[]) => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
            setCurrentIndex(targetIndex);
            const targetAnswer = updatedAnswers[targetIndex];
            const hasAnswer = Number.isInteger(targetAnswer) && targetAnswer >= 0;
            setSelectedAnswer(hasAnswer ? targetAnswer : null);
            setRevealed(hasAnswer);
            Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
        });
    };

    const handlePrevious = () => {
        if (currentIndex === 0) return;
        const updatedAnswers = withCommittedCurrentAnswer();
        setAnswers(updatedAnswers);
        animateToQuestion(currentIndex - 1, updatedAnswers);
    };

    const handleNext = async () => {
        const currentQuestion = questions[currentIndex];
        if (!currentQuestion) return;

        const updatedAnswers = withCommittedCurrentAnswer();
        setAnswers(updatedAnswers);

        if (currentIndex + 1 >= questions.length) {
            // Submit quiz
            try {
                if (quizId) {
                    await submitQuiz(quizId, updatedAnswers);
                }
            } catch (e) { /* best effort */ }
            const score = updatedAnswers.reduce((acc, answer, i) => {
                return acc + (questions[i] && answer === questions[i].correctIndex ? 1 : 0);
            }, 0);
            navigation.replace('Results', { quizId: quizId || 'quiz-local', score, total: questions.length });
            return;
        }

        animateToQuestion(currentIndex + 1, updatedAnswers);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Generating your quiz with AI...</Text>
                <Text style={styles.loadingSubtext}>Topic: {topic}</Text>
            </View>
        );
    }

    const q = questions[currentIndex];
    if (!q) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Quiz data is not available.</Text>
                <Text style={styles.loadingSubtext}>Please go back and generate again.</Text>
                <TouchableOpacity style={styles.nextBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
                    <Text style={styles.nextBtnText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

    return (
        <View style={styles.container}>
            {/* Progress bar */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.counter}>{currentIndex + 1} / {questions.length}</Text>
                    <View style={styles.modeBadge}>
                        <Text style={styles.modeBadgeText}>{mode === 'quick' ? '⚡ Quick' : '📚 Extended'}</Text>
                    </View>
                </View>

                {/* Question */}
                <Animated.View style={[styles.questionCard, { opacity: fadeAnim }]}>
                    <Text style={styles.questionTopic}>{topic}</Text>
                    <Text style={styles.questionText}>{q.question}</Text>

                    {/* Options */}
                    <View style={styles.options}>
                        {q.options.map((option, i) => {
                            let optionStyle = styles.option;
                            let textStyle = styles.optionText;
                            if (revealed) {
                                if (i === q.correctIndex) {
                                    optionStyle = { ...styles.option, ...styles.optionCorrect };
                                    textStyle = { ...styles.optionText, color: colors.success };
                                } else if (i === selectedAnswer && i !== q.correctIndex) {
                                    optionStyle = { ...styles.option, ...styles.optionWrong };
                                    textStyle = { ...styles.optionText, color: colors.accent };
                                }
                            } else if (i === selectedAnswer) {
                                optionStyle = { ...styles.option, ...styles.optionSelected };
                            }

                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={optionStyle}
                                    onPress={() => handleAnswer(i)}
                                    activeOpacity={0.8}
                                    disabled={revealed}
                                >
                                    <View style={styles.optionLetter}>
                                        <Text style={styles.optionLetterText}>{String.fromCharCode(65 + i)}</Text>
                                    </View>
                                    <Text style={textStyle}>{option}</Text>
                                    {revealed && i === q.correctIndex && <Text style={styles.checkmark}>✓</Text>}
                                    {revealed && i === selectedAnswer && i !== q.correctIndex && <Text style={styles.crossmark}>✗</Text>}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Explanation */}
                    {revealed && (
                        <View style={[styles.explanation, selectedAnswer === q.correctIndex ? styles.explanationCorrect : styles.explanationWrong]}>
                            <Text style={styles.explanationLabel}>
                                {selectedAnswer === q.correctIndex ? '🎉 Correct!' : '❌ Not quite'}
                            </Text>
                            <Text style={styles.explanationText}>{q.explanation}</Text>
                        </View>
                    )}
                </Animated.View>

                {currentIndex > 0 && (
                    <View style={styles.prevRow}>
                        <TouchableOpacity style={styles.prevBtn} onPress={handlePrevious} activeOpacity={0.85}>
                            <Text style={styles.prevBtnText}>← Previous question</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Action buttons */}
                {revealed && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.doubtBtn}
                            onPress={() => {
                                if (!quizId) return;
                                navigation.navigate('Doubts', {
                                    quizId,
                                    questionIndex: currentIndex,
                                    question: q.question,
                                });
                            }}
                            activeOpacity={0.85}
                            disabled={!quizId}
                        >
                            <Text style={styles.doubtBtnText}>💬 Ask a question</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                            <Text style={styles.nextBtnText}>
                                {currentIndex + 1 < questions.length ? 'Next →' : 'See Results 🎯'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: {
        flex: 1, backgroundColor: colors.background,
        justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl,
    },
    loadingText: { ...typography.h4, color: colors.textPrimary, textAlign: 'center' },
    loadingSubtext: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
    progressBar: {
        height: 4, backgroundColor: colors.border,
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    },
    progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
    content: { padding: spacing.xl, paddingTop: 24, paddingBottom: 40, gap: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 32 },
    backBtn: {},
    backIcon: { fontSize: 22, color: colors.textPrimary },
    counter: { flex: 1, ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
    modeBadge: {
        backgroundColor: colors.primaryFaded, borderRadius: radii.full,
        paddingHorizontal: spacing.md, paddingVertical: 4,
    },
    modeBadgeText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
    questionCard: {
        backgroundColor: colors.surface, borderRadius: radii.xl,
        padding: spacing.lg, gap: spacing.md, ...shadows.md,
    },
    questionTopic: { ...typography.label, color: colors.primary, textTransform: 'uppercase' },
    questionText: { ...typography.h4, color: colors.textPrimary, lineHeight: 26 },
    options: { gap: spacing.sm },
    option: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.background, borderRadius: radii.md,
        padding: spacing.md, borderWidth: 1.5, borderColor: colors.border,
    },
    optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryFaded },
    optionCorrect: { borderColor: colors.success, backgroundColor: colors.successLight },
    optionWrong: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    optionLetter: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
    },
    optionLetterText: { ...typography.label, color: colors.textSecondary },
    optionText: { flex: 1, ...typography.body, color: colors.textPrimary },
    checkmark: { fontSize: 18, color: colors.success },
    crossmark: { fontSize: 18, color: colors.accent },
    explanation: { borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
    explanationCorrect: { backgroundColor: colors.successLight },
    explanationWrong: { backgroundColor: colors.accentLight },
    explanationLabel: { ...typography.bodyMedium, color: colors.textPrimary },
    explanationText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
    prevRow: { marginTop: spacing.xs },
    prevBtn: {
        alignSelf: 'flex-start',
        borderRadius: radii.full,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    prevBtnText: { ...typography.label, color: colors.textPrimary },
    actionRow: { flexDirection: 'row', gap: spacing.md },
    doubtBtn: {
        flex: 1, borderRadius: radii.md, paddingVertical: spacing.md,
        backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
    },
    doubtBtnText: { ...typography.bodyMedium, color: colors.textPrimary },
    nextBtn: {
        flex: 1, borderRadius: radii.md, paddingVertical: spacing.md,
        backgroundColor: colors.primary, alignItems: 'center', ...shadows.sm,
    },
    nextBtnText: { ...typography.bodyMedium, color: '#fff' },
});
