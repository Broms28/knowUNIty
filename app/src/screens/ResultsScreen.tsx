import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { colors, spacing, radii, typography, shadows } from '../constants/theme';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Results'>;
    route: RouteProp<RootStackParamList, 'Results'>;
};

function getScoreEmoji(pct: number) {
    if (pct >= 0.8) return '🎉';
    if (pct >= 0.6) return '👍';
    if (pct >= 0.4) return '💪';
    return '📖';
}

function getScoreMessage(pct: number) {
    if (pct >= 0.8) return "Excellent! You're well prepared.";
    if (pct >= 0.6) return "Good work! A few more minutes will help.";
    if (pct >= 0.4) return "Decent start. Review the weak areas below.";
    return "Time to re-read your notes before class!";
}

export default function ResultsScreen({ navigation, route }: Props) {
    const { quizId, score, total } = route.params;
    const pct = score / total;
    const scaleAnim = useRef(new Animated.Value(0.5)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    const scoreColor = pct >= 0.8 ? colors.success : pct >= 0.6 ? colors.warning : colors.accent;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Score circle */}
            <Animated.View style={[styles.scoreCircleWrap, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
                <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                    <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
                    <Text style={styles.scoreOf}>/ {total}</Text>
                    <Text style={styles.scoreEmoji}>{getScoreEmoji(pct)}</Text>
                </View>
            </Animated.View>

            <Animated.View style={{ opacity: fadeAnim, gap: spacing.md }}>
                <Text style={styles.scoreMessage}>{getScoreMessage(pct)}</Text>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    {[
                        { label: 'Correct', value: score, color: colors.success },
                        { label: 'Incorrect', value: total - score, color: colors.accent },
                        { label: 'Score', value: `${Math.round(pct * 100)}%`, color: colors.primary },
                    ].map((s) => (
                        <View key={s.label} style={styles.statCard}>
                            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Actions */}
                <TouchableOpacity
                    style={styles.homeBtn}
                    onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
                    activeOpacity={0.85}
                >
                    <Text style={styles.homeBtnText}>Back to Home</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.85}
                >
                    <Text style={styles.retryBtnText}>Try another topic 🔄</Text>
                </TouchableOpacity>

                {/* Tip */}
                <View style={styles.tip}>
                    <Text style={styles.tipEmoji}>💡</Text>
                    <Text style={styles.tipText}>
                        Tap "Ask a question" on any quiz item to chat with AI about topics you found tricky.
                    </Text>
                </View>
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
        padding: spacing.xl, paddingTop: 80, paddingBottom: 60,
        alignItems: 'center', gap: spacing.lg,
    },
    scoreCircleWrap: { marginBottom: spacing.md },
    scoreCircle: {
        width: 160, height: 160, borderRadius: 80,
        borderWidth: 6, backgroundColor: colors.surface,
        justifyContent: 'center', alignItems: 'center',
        ...shadows.lg,
    },
    scoreNumber: { ...typography.h1, fontSize: 48 },
    scoreOf: { ...typography.body, color: colors.textSecondary },
    scoreEmoji: { fontSize: 28, marginTop: spacing.xs },
    scoreMessage: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
    statsRow: { flexDirection: 'row', gap: spacing.md, width: '100%' },
    statCard: {
        flex: 1, backgroundColor: colors.surface, borderRadius: radii.xl,
        padding: spacing.md, alignItems: 'center', ...shadows.sm,
    },
    statValue: { ...typography.h2, marginBottom: 2 },
    statLabel: { ...typography.caption, color: colors.textSecondary },
    homeBtn: {
        backgroundColor: colors.primary, borderRadius: radii.lg, width: '100%',
        paddingVertical: spacing.md + 2, alignItems: 'center', ...shadows.md,
    },
    homeBtnText: { ...typography.h4, color: '#fff' },
    retryBtn: {
        paddingVertical: spacing.md, alignItems: 'center', width: '100%',
        borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
    },
    retryBtnText: { ...typography.bodyMedium, color: colors.textPrimary },
    tip: {
        backgroundColor: colors.cardPurple, borderRadius: radii.lg,
        padding: spacing.md, flexDirection: 'row', gap: spacing.sm, width: '100%',
    },
    tipEmoji: { fontSize: 22 },
    tipText: { flex: 1, ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
});
