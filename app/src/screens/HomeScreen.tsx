import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, CalendarEvent } from '../types';
import { colors, spacing, radii, typography, shadows } from '../constants/theme';
import { getNextEvent } from '../services/api';
import { signOut } from '../services/auth';
import { registerForPushNotifications } from '../services/notifications';
import { auth } from '../services/firebase';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Home'> };

function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function minutesUntil(iso: string) {
    return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

export default function HomeScreen({ navigation }: Props) {
    const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const user = auth.currentUser;

    const fetchNextEvent = async () => {
        try {
            const data = await getNextEvent();
            setNextEvent(data?.event || null);
        } catch (e) {
            // No event or error
            setNextEvent(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchNextEvent();
            registerForPushNotifications().catch(console.warn);
        }, [])
    );

    const handleSignOut = async () => {
        await signOut();
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    };

    const mins = nextEvent ? minutesUntil(nextEvent.startTime) : null;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNextEvent(); }} tintColor={colors.primary} />}
        >
            {/* Top bar */}
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.greeting}>Hey {user?.displayName?.split(' ')[0] || 'there'} 👋</Text>
                    <Text style={styles.subGreeting}>Ready to warm up?</Text>
                </View>
                <TouchableOpacity onPress={handleSignOut} style={styles.avatarBtn}>
                    <Text style={styles.avatarText}>{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</Text>
                </TouchableOpacity>
            </View>

            {/* Next Class Card */}
            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : nextEvent ? (
                <View style={styles.nextClassCard}>
                    <View style={styles.nextClassTop}>
                        <View style={styles.nextClassBadge}>
                            <Text style={styles.nextClassBadgeText}>
                                {mins && mins <= 60 ? `in ${mins} min` : formatDate(nextEvent.startTime)}
                            </Text>
                        </View>
                        <Text style={styles.nextClassTime}>{formatTime(nextEvent.startTime)}</Text>
                    </View>
                    <Text style={styles.nextClassTitle}>{nextEvent.title}</Text>
                    {mins !== null && mins <= 30 && (
                        <View style={styles.urgentBanner}>
                            <Text style={styles.urgentText}>⚡ Starting soon — warm up now!</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.warmUpBtn}
                        onPress={() => navigation.navigate('WarmUp', { eventId: nextEvent.eventId, eventTitle: nextEvent.title })}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.warmUpBtnText}>🚀 Start Warm-Up</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.noEventCard}>
                    <Text style={styles.noEventEmoji}>🗓️</Text>
                    <Text style={styles.noEventTitle}>No upcoming classes</Text>
                    <Text style={styles.noEventSub}>Connect your calendar or create a manual warm-up</Text>
                </View>
            )}

            {/* Manual warm-up */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Quick start</Text>
            </View>

            <View style={styles.quickCards}>
                {[
                    { icon: '⚡', label: 'Quick Quiz', desc: '5 questions, ~3 min', mode: 'quick' as const },
                    { icon: '📚', label: 'Extended Quiz', desc: '15 questions, ~10 min', mode: 'extended' as const },
                ].map((item) => (
                    <TouchableOpacity
                        key={item.mode}
                        style={styles.quickCard}
                        onPress={() => navigation.navigate('WarmUp', {})}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.quickCardIcon}>{item.icon}</Text>
                        <Text style={styles.quickCardLabel}>{item.label}</Text>
                        <Text style={styles.quickCardDesc}>{item.desc}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Tips */}
            <View style={styles.tipCard}>
                <Text style={styles.tipEmoji}>💡</Text>
                <Text style={styles.tipText}>
                    Students who review key concepts 30 minutes before class retain <Text style={{ fontWeight: '700', color: colors.primary }}>40% more</Text> by end of week.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl, paddingTop: 60, paddingBottom: 40, gap: spacing.md },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    greeting: { ...typography.h3, color: colors.textPrimary },
    subGreeting: { ...typography.caption, color: colors.textSecondary },
    avatarBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { ...typography.h4, color: '#fff' },
    loadingBox: { height: 200, justifyContent: 'center', alignItems: 'center' },
    nextClassCard: {
        backgroundColor: colors.primary, borderRadius: radii.xl,
        padding: spacing.lg, ...shadows.lg, gap: spacing.sm,
    },
    nextClassTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    nextClassBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radii.full,
        paddingHorizontal: spacing.md, paddingVertical: 4,
    },
    nextClassBadgeText: { ...typography.label, color: '#fff', textTransform: 'uppercase' },
    nextClassTime: { ...typography.h4, color: 'rgba(255,255,255,0.8)' },
    nextClassTitle: { ...typography.h2, color: '#fff' },
    urgentBanner: {
        backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radii.md,
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    },
    urgentText: { ...typography.caption, color: '#fff' },
    warmUpBtn: {
        backgroundColor: '#fff', borderRadius: radii.md,
        paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs,
    },
    warmUpBtnText: { ...typography.h4, color: colors.primary },
    noEventCard: {
        backgroundColor: colors.surface, borderRadius: radii.xl,
        padding: spacing.xl, alignItems: 'center', gap: spacing.sm, ...shadows.sm,
    },
    noEventEmoji: { fontSize: 48 },
    noEventTitle: { ...typography.h4, color: colors.textPrimary },
    noEventSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
    sectionHeader: { marginTop: spacing.md },
    sectionTitle: { ...typography.h4, color: colors.textPrimary },
    quickCards: { flexDirection: 'row', gap: spacing.md },
    quickCard: {
        flex: 1, backgroundColor: colors.surface, borderRadius: radii.xl,
        padding: spacing.lg, gap: spacing.xs, ...shadows.sm,
    },
    quickCardIcon: { fontSize: 28 },
    quickCardLabel: { ...typography.bodyMedium, color: colors.textPrimary },
    quickCardDesc: { ...typography.caption, color: colors.textSecondary },
    tipCard: {
        backgroundColor: colors.cardPurple, borderRadius: radii.lg,
        padding: spacing.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    },
    tipEmoji: { fontSize: 20 },
    tipText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 20 },
});
