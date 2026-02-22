import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, QuizReviewPayload } from '../types';
import { colors, spacing, radii, typography, shadows } from '../constants/theme';
import { getQuizReview } from '../services/api';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'QuizReview'>;
    route: RouteProp<RootStackParamList, 'QuizReview'>;
};

function formatWhen(iso?: string) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function QuizReviewScreen({ navigation, route }: Props) {
    const { quizId } = route.params;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reviewData, setReviewData] = useState<QuizReviewPayload['review'] | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getQuizReview(quizId);
            setReviewData(res?.review || null);
        } catch (err: any) {
            const backendError = err?.response?.data?.error;
            setError(backendError || err?.message || 'Failed to load quiz review');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [quizId]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading review...</Text>
            </View>
        );
    }

    if (error || !reviewData) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorTitle}>Could not load quiz review</Text>
                <Text style={styles.errorText}>{error || 'No review data available.'}</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={load} activeOpacity={0.85}>
                    <Text style={styles.primaryBtnText}>Try again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
                    <Text style={styles.secondaryBtnText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const { quiz, attempt } = reviewData;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Warm-up Review</Text>
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryTopic}>{quiz.topic}</Text>
                <Text style={styles.summaryMeta}>
                    {attempt ? `Score ${attempt.score}/${attempt.total}` : 'No submitted attempt'}
                </Text>
                <Text style={styles.summaryMeta}>Completed {formatWhen(quiz.completedAt || attempt?.createdAt)}</Text>
            </View>

            {!attempt && (
                <View style={styles.emptyAttemptCard}>
                    <Text style={styles.emptyAttemptTitle}>No submitted attempt yet</Text>
                    <Text style={styles.emptyAttemptText}>Submit a warm-up quiz first to review answers.</Text>
                </View>
            )}

            {quiz.questions.map((q, index) => {
                const selectedIndex = Array.isArray(attempt?.answers) ? Number(attempt?.answers[index]) : -1;
                const correctIndex = Number(q.correctIndex);
                const selectedLabel = selectedIndex >= 0 && selectedIndex < q.options.length
                    ? String.fromCharCode(65 + selectedIndex)
                    : 'Not answered';

                return (
                    <View key={`${quiz.id}_${index}`} style={styles.questionCard}>
                        <Text style={styles.questionCounter}>Question {index + 1}</Text>
                        <Text style={styles.questionText}>{q.question}</Text>

                        <View style={styles.optionsWrap}>
                            {q.options.map((opt, optIndex) => {
                                const isCorrect = optIndex === correctIndex;
                                const isSelected = optIndex === selectedIndex;
                                return (
                                    <View
                                        key={`${quiz.id}_${index}_${optIndex}`}
                                        style={[
                                            styles.option,
                                            isCorrect && styles.optionCorrect,
                                            isSelected && !isCorrect && styles.optionSelectedWrong,
                                        ]}
                                    >
                                        <Text style={styles.optionLetter}>{String.fromCharCode(65 + optIndex)}</Text>
                                        <Text style={styles.optionText}>{opt}</Text>
                                        {isCorrect && <Text style={styles.optionTag}>Correct</Text>}
                                        {isSelected && !isCorrect && <Text style={styles.optionTagWrong}>Your answer</Text>}
                                    </View>
                                );
                            })}
                        </View>

                        <Text style={styles.selectionLine}>Your selection: {selectedLabel}</Text>
                        <Text style={styles.explanationLabel}>Why this is correct</Text>
                        <Text style={styles.explanationText}>{q.explanation}</Text>
                    </View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl, paddingTop: 56, paddingBottom: 40, gap: spacing.md },
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
        gap: spacing.md,
    },
    loadingText: { ...typography.body, color: colors.textSecondary },
    errorTitle: { ...typography.h4, color: colors.textPrimary, textAlign: 'center' },
    errorText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    backBtn: { paddingVertical: spacing.xs, paddingRight: spacing.sm },
    backIcon: { fontSize: 24, color: colors.textPrimary },
    headerTitle: { ...typography.h3, color: colors.textPrimary },
    summaryCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        padding: spacing.lg,
        gap: spacing.xs,
        ...shadows.sm,
    },
    summaryTopic: { ...typography.h4, color: colors.textPrimary },
    summaryMeta: { ...typography.caption, color: colors.textSecondary },
    emptyAttemptCard: {
        backgroundColor: colors.cardPurple,
        borderRadius: radii.lg,
        padding: spacing.md,
        gap: spacing.xs,
    },
    emptyAttemptTitle: { ...typography.bodyMedium, color: colors.textPrimary },
    emptyAttemptText: { ...typography.caption, color: colors.textSecondary },
    questionCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        padding: spacing.md,
        gap: spacing.sm,
        ...shadows.sm,
    },
    questionCounter: { ...typography.label, color: colors.primary, textTransform: 'uppercase' },
    questionText: { ...typography.bodyMedium, color: colors.textPrimary, lineHeight: 24 },
    optionsWrap: { gap: spacing.xs },
    option: {
        backgroundColor: colors.background,
        borderRadius: radii.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        padding: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    optionCorrect: {
        borderColor: colors.success,
        backgroundColor: '#ECFDF3',
    },
    optionSelectedWrong: {
        borderColor: colors.accent,
        backgroundColor: '#FFF1F2',
    },
    optionLetter: { ...typography.label, color: colors.textSecondary, width: 14 },
    optionText: { ...typography.body, color: colors.textPrimary, flex: 1 },
    optionTag: { ...typography.caption, color: colors.success, fontWeight: '700' },
    optionTagWrong: { ...typography.caption, color: colors.accent, fontWeight: '700' },
    selectionLine: { ...typography.caption, color: colors.textSecondary },
    explanationLabel: { ...typography.label, color: colors.textPrimary, textTransform: 'uppercase' },
    explanationText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
    primaryBtn: {
        backgroundColor: colors.primary,
        borderRadius: radii.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        minWidth: 180,
        alignItems: 'center',
    },
    primaryBtnText: { ...typography.bodyMedium, color: '#fff' },
    secondaryBtn: {
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        minWidth: 180,
        alignItems: 'center',
    },
    secondaryBtnText: { ...typography.bodyMedium, color: colors.textPrimary },
});
