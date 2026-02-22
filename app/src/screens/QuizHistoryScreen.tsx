import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, QuizHistoryItem } from '../types';
import { colors, spacing, radii, typography, shadows } from '../constants/theme';
import { getQuizHistory } from '../services/api';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'QuizHistory'>;
};

function formatWhen(iso?: string | null) {
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

export default function QuizHistoryScreen({ navigation }: Props) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<QuizHistoryItem[]>([]);

    const load = async () => {
        try {
            const data = await getQuizHistory(100);
            setItems(Array.isArray(data?.history) ? data.history : []);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            load();
        }, [])
    );

    const renderItem = ({ item }: { item: QuizHistoryItem }) => {
        const hasResult = typeof item.score === 'number' && item.total > 0;
        return (
            <View style={styles.card}>
                <View style={styles.cardTopRow}>
                    <Text style={styles.topic} numberOfLines={1}>{item.topic}</Text>
                    <View style={[styles.modePill, item.mode === 'extended' && styles.modePillExtended]}>
                        <Text style={styles.modeText}>{item.mode === 'extended' ? 'Extended' : 'Quick'}</Text>
                    </View>
                </View>

                <Text style={styles.meta}>Created {formatWhen(item.createdAt)}</Text>
                <Text style={styles.meta}>
                    {item.completedAt ? `Completed ${formatWhen(item.completedAt)}` : 'Not completed yet'}
                </Text>
                <Text style={styles.meta}>
                    {hasResult ? `Score ${item.score}/${item.total}` : 'No score yet'}
                </Text>

                <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => navigation.navigate('QuizReview', { quizId: item.quizId })}
                    activeOpacity={0.85}
                >
                    <Text style={styles.reviewBtnText}>Open review</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Quiz History</Text>
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.quizId}
                    contentContainerStyle={items.length ? styles.listContent : styles.listEmptyContent}
                    refreshControl={(
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                load();
                            }}
                            tintColor={colors.primary}
                        />
                    )}
                    ListEmptyComponent={(
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>No quizzes yet</Text>
                            <Text style={styles.emptySub}>Complete your first warm-up to see history here.</Text>
                            <TouchableOpacity
                                style={styles.emptyBtn}
                                onPress={() => navigation.navigate('WarmUp', {})}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.emptyBtnText}>Start a warm-up</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    renderItem={renderItem}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md,
    },
    backBtn: { paddingVertical: spacing.xs, paddingRight: spacing.sm },
    backIcon: { fontSize: 24, color: colors.textPrimary },
    headerTitle: { ...typography.h3, color: colors.textPrimary },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.md, paddingBottom: 40 },
    listEmptyContent: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing.md },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        padding: spacing.md,
        gap: spacing.xs,
        ...shadows.sm,
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    topic: { flex: 1, ...typography.h4, color: colors.textPrimary },
    modePill: {
        backgroundColor: colors.primaryFaded,
        borderRadius: radii.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
    },
    modePillExtended: { backgroundColor: colors.cardPurple },
    modeText: { ...typography.label, color: colors.primary },
    meta: { ...typography.caption, color: colors.textSecondary },
    reviewBtn: {
        marginTop: spacing.sm,
        alignSelf: 'flex-start',
        backgroundColor: colors.primary,
        borderRadius: radii.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    reviewBtnText: { ...typography.label, color: '#fff' },
    emptyCard: {
        marginTop: spacing.xl,
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        padding: spacing.xl,
        gap: spacing.sm,
        ...shadows.sm,
    },
    emptyTitle: { ...typography.h4, color: colors.textPrimary },
    emptySub: { ...typography.body, color: colors.textSecondary },
    emptyBtn: {
        marginTop: spacing.sm,
        alignSelf: 'flex-start',
        backgroundColor: colors.primary,
        borderRadius: radii.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    emptyBtnText: { ...typography.label, color: '#fff' },
});
