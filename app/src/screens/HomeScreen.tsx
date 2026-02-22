import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    RefreshControl, ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, CalendarEvent, QuizReviewSummary } from '../types';
import { colors, spacing, radii, typography, shadows } from '../constants/theme';
import { getLatestQuizReview, getNextEvent } from '../services/api';
import { getUserProfile } from '../services/auth';
import { registerForPushNotifications } from '../services/notifications';
import { auth, db } from '../services/firebase';
import { doc, setDoc } from '@firebase/firestore';
import { updateProfile } from '@firebase/auth';

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

function formatCompletedAt(iso?: string) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function sanitizeDisplayName(value?: string | null, email?: string | null) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const looksLikeEmail = /\S+@\S+\.\S+/.test(trimmed);
    if (looksLikeEmail) return '';
    if (['user', 'profile', 'unknown', 'n/a', 'there'].includes(trimmed.toLowerCase())) return '';
    if (email && trimmed.toLowerCase() === email.toLowerCase()) return '';
    return trimmed;
}

export default function HomeScreen({ navigation }: Props) {
    const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingEvents, setUpdatingEvents] = useState(false);
    const [calendarLinked, setCalendarLinked] = useState<boolean>(false);
    const [calendarSource, setCalendarSource] = useState<string | null>(null);
    const [profileName, setProfileName] = useState<string>('');
    const [latestReview, setLatestReview] = useState<QuizReviewSummary | null>(null);
    const user = auth.currentUser;

    const fetchNextEvent = async (forceSync = false) => {
        try {
            const data = await getNextEvent(forceSync);
            setNextEvent(data?.event || null);
        } catch (e) {
            // No event or error
            setNextEvent(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchCalendarStatus = async () => {
        try {
            const uid = auth.currentUser?.uid;
            if (!uid) {
                setCalendarLinked(false);
                setCalendarSource(null);
                setProfileName('');
                return;
            }
            const profile = await getUserProfile(uid) as any;
            const nameFromProfile = String(
                profile?.name || profile?.fullName || profile?.full_name || profile?.username || ''
            ).trim();
            setProfileName(nameFromProfile);
            const resolvedName = sanitizeDisplayName(nameFromProfile, auth.currentUser?.email) ||
                sanitizeDisplayName(auth.currentUser?.displayName, auth.currentUser?.email);
            const profileStoredName = sanitizeDisplayName(
                profile?.name || profile?.fullName || profile?.full_name || profile?.username,
                auth.currentUser?.email
            );
            if (resolvedName && profileStoredName !== resolvedName) {
                await setDoc(doc(db, 'users', uid), {
                    name: resolvedName,
                    fullName: resolvedName,
                }, { merge: true });
                setProfileName(resolvedName);
                if (auth.currentUser && auth.currentUser.displayName !== resolvedName) {
                    try {
                        await updateProfile(auth.currentUser, { displayName: resolvedName });
                    } catch {
                        // Non-blocking
                    }
                }
            }
            const icalUrl = profile?.calendarConfig?.icalUrl || profile?.['calendarConfig.icalUrl'];
            const linked = profile?.calendarType === 'google' ||
                (profile?.calendarType === 'ical' && !!icalUrl);
            setCalendarLinked(!!linked);

            if (profile?.calendarType === 'ical' && icalUrl) {
                try {
                    setCalendarSource(new URL(icalUrl).host);
                } catch {
                    setCalendarSource(null);
                }
            } else if (profile?.calendarType === 'google') {
                setCalendarSource('Google Calendar');
            } else {
                setCalendarSource(null);
            }
        } catch {
            setCalendarLinked(false);
            setCalendarSource(null);
            setProfileName('');
        }
    };

    const fetchLatestReview = async () => {
        try {
            const data = await getLatestQuizReview();
            setLatestReview(data?.review || null);
        } catch {
            setLatestReview(null);
        }
    };

    const refreshData = async (manual = false) => {
        if (manual) setUpdatingEvents(true);
        try {
            await Promise.all([fetchNextEvent(manual), fetchCalendarStatus(), fetchLatestReview()]);
        } finally {
            setRefreshing(false);
            if (manual) setUpdatingEvents(false);
        }
    };

    const persistResolvedName = async (name: string) => {
        const clean = sanitizeDisplayName(name, auth.currentUser?.email);
        const uid = auth.currentUser?.uid;
        if (!clean || !uid) return;
        await setDoc(doc(db, 'users', uid), { name: clean, fullName: clean }, { merge: true });
        if (auth.currentUser && auth.currentUser.displayName !== clean) {
            try {
                await updateProfile(auth.currentUser, { displayName: clean });
            } catch {
                // Non-blocking
            }
        }
    };

    useFocusEffect(
        useCallback(() => {
            refreshData();
            registerForPushNotifications().catch(console.warn);
        }, [])
    );

    const mins = nextEvent ? minutesUntil(nextEvent.startTime) : null;
    const displayName = sanitizeDisplayName(profileName, user?.email) ||
        sanitizeDisplayName(user?.displayName, user?.email) ||
        'there';
    const avatarInitial = displayName[0]?.toUpperCase() || 'U';

    const handleOpenAccount = async () => {
        await persistResolvedName(displayName);
        navigation.push('Account', { suggestedName: displayName });
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refreshData(); }} tintColor={colors.primary} />}
        >
            {/* Top bar */}
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.greeting}>Hey {displayName.split(' ')[0] || 'there'} 👋</Text>
                    <Text style={styles.subGreeting}>Ready to warm up?</Text>
                </View>
                <TouchableOpacity
                    onPress={handleOpenAccount}
                    style={styles.avatarBtn}
                >
                    <Text style={styles.avatarText}>{avatarInitial}</Text>
                </TouchableOpacity>
            </View>

            {/* Calendar status */}
            <View style={styles.statusCard}>
                <View style={styles.statusHeaderRow}>
                    <Text style={styles.statusTitle}>Calendar</Text>
                    <Text style={[styles.statusPill, { color: calendarLinked ? colors.success : colors.warning }]}>
                        {calendarLinked ? 'Linked' : 'Not linked'}
                    </Text>
                </View>
                <Text style={styles.statusSub}>
                    {calendarLinked ? (calendarSource ? `Source: ${calendarSource}` : 'Calendar connected') : 'Connect your calendar to sync classes automatically'}
                </Text>
                {!calendarLinked && (
                    <TouchableOpacity
                        style={styles.statusBtn}
                        onPress={() => navigation.navigate('CalendarConnect')}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.statusBtnText}>Connect calendar</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.statusBtn, styles.statusBtnRefresh, updatingEvents && styles.statusBtnDisabled]}
                    onPress={() => refreshData(true)}
                    activeOpacity={0.85}
                    disabled={updatingEvents}
                >
                    {updatingEvents ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <Text style={styles.statusBtnText}>Update events</Text>
                    )}
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

            {latestReview && (
                <View style={styles.reviewCard}>
                    <Text style={styles.reviewTitle}>Last warm-up</Text>
                    <Text style={styles.reviewTopic}>{latestReview.topic}</Text>
                    <Text style={styles.reviewMeta}>
                        Score {latestReview.score}/{latestReview.total}
                        {latestReview.completedAt ? ` · ${formatCompletedAt(latestReview.completedAt)}` : ''}
                    </Text>
                    <TouchableOpacity
                        style={styles.reviewBtn}
                        onPress={() => navigation.navigate('QuizReview', { quizId: latestReview.quizId })}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.reviewBtnText}>Review warm-up</Text>
                    </TouchableOpacity>
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
    statusCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: spacing.md,
        gap: spacing.xs,
        ...shadows.sm,
    },
    statusHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusTitle: { ...typography.h4, color: colors.textPrimary },
    statusPill: { ...typography.label, textTransform: 'uppercase' },
    statusSub: { ...typography.caption, color: colors.textSecondary },
    statusBtn: {
        marginTop: spacing.sm,
        alignSelf: 'flex-start',
        backgroundColor: colors.primaryFaded,
        borderRadius: radii.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    statusBtnRefresh: {
        backgroundColor: colors.background,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    statusBtnDisabled: { opacity: 0.7 },
    statusBtnText: { ...typography.label, color: colors.primary },
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
    reviewCard: {
        backgroundColor: colors.surface, borderRadius: radii.xl,
        padding: spacing.lg, gap: spacing.xs, ...shadows.sm,
    },
    reviewTitle: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase' },
    reviewTopic: { ...typography.h4, color: colors.textPrimary },
    reviewMeta: { ...typography.caption, color: colors.textSecondary },
    reviewBtn: {
        marginTop: spacing.sm, alignSelf: 'flex-start',
        backgroundColor: colors.primaryFaded, borderRadius: radii.full,
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
        borderWidth: 1.5, borderColor: colors.primary,
    },
    reviewBtnText: { ...typography.label, color: colors.primary },
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
