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
                setQuestions(data.quiz.questions);
                setQuizId(data.quiz.id);
            } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to generate quiz', [
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

    const handleNext = async () => {
        const newAnswers = [...answers, selectedAnswer ?? -1];
        setAnswers(newAnswers);

        // Animate out
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(async () => {
            if (currentIndex + 1 >= questions.length) {
                // Submit quiz
                try {
                    await submitQuiz(quizId!, newAnswers);
                } catch (e) { /* best effort */ }
                const score = newAnswers.filter((a, i) => a === questions[i].correctIndex).length;
                navigation.replace('Results', { quizId: quizId!, score, total: questions.length });
            } else {
                setCurrentIndex(currentIndex + 1);
                setSelectedAnswer(null);
                setRevealed(false);
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
            }
        });
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
    const progress = (currentIndex + 1) / questions.length;

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
                                        <Text style={styles.optionLetterText}>{['A', 'B', 'C', 'D'][i]}</Text>
                                    </View>
                                    <Text style={textStyle} numberOfLines={3}>{option}</Text>
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

                {/* Action buttons */}
                {revealed && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.doubtBtn}
                            onPress={() => navigation.navigate('Doubts', {
                                quizId: quizId!,
                                questionIndex: currentIndex,
                                question: q.question,
                            })}
                            activeOpacity={0.85}
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
