import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { colors, spacing, radii, typography, shadows } from '../constants/theme';
import { auth, db } from '../services/firebase';
import { getUserProfile, signOut } from '../services/auth';
import { getNotificationStatus, sendTestNotification } from '../services/api';
import {
    getPushSupportHint,
    isExpoGoRuntime,
    registerForPushNotifications,
    sendLocalTestNotification,
} from '../services/notifications';
import { doc, setDoc } from '@firebase/firestore';
import { updateProfile } from '@firebase/auth';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Account'>;
    route: RouteProp<RootStackParamList, 'Account'>;
};

type ProfileData = {
    name?: string;
    fullName?: string;
    full_name?: string;
    username?: string;
    email?: string;
    calendarType?: 'ical' | 'google' | null;
    calendarConfig?: { icalUrl?: string };
    devicePushToken?: string | null;
    notificationDebug?: {
        lastTestSentAt?: string | null;
        lastTestStatus?: string | null;
        lastTestError?: string | null;
    };
};

type NotificationStatusData = {
    enabled: boolean;
    tokenType: 'expo' | 'fcm' | null;
    tokenMasked: string | null;
    upcomingEventsCount: number;
    pendingNotificationsCount: number;
    lastTestSentAt: string | null;
    lastTestStatus: string | null;
    lastTestError: string | null;
    lastTestReceiptStatus: string | null;
    lastTestReceiptError: string | null;
};

function sanitizeDisplayName(value?: string | null, email?: string | null) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const looksLikeEmail = /\S+@\S+\.\S+/.test(trimmed);
    if (looksLikeEmail) return '';
    if (['user', 'profile', 'unknown', 'n/a', 'there'].includes(trimmed.toLowerCase())) return '';
    if (email && trimmed.toLowerCase() === email.toLowerCase()) return '';
    return trimmed;
}

function fallbackNameFromEmail(email?: string | null) {
    const local = String(email || '').split('@')[0]?.trim();
    if (!local) return '';
    const withSpaces = local.replace(/[._-]+/g, ' ').trim();
    return withSpaces
        .split(/\s+/)
        .map((s) => s ? s[0].toUpperCase() + s.slice(1) : '')
        .join(' ')
        .trim();
}

export default function AccountScreen({ navigation, route }: Props) {
    const user = auth.currentUser;
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifTesting, setNotifTesting] = useState(false);
    const [notifStatus, setNotifStatus] = useState<NotificationStatusData | null>(null);
    const pushHint = getPushSupportHint();
    const expoGoRuntime = isExpoGoRuntime();

    const loadProfile = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
            setProfile(null);
            setLoading(false);
            return;
        }

        let data: ProfileData | null = null;
        try {
            data = await getUserProfile(uid) as ProfileData | null;
        } catch {
            data = null;
        }

        const currentEmail = auth.currentUser?.email || null;
        const profileName = sanitizeDisplayName(
            data?.name || data?.fullName || data?.full_name || data?.username || null,
            currentEmail
        );
        const suggestedName = sanitizeDisplayName(route.params?.suggestedName, currentEmail);
        const authName = sanitizeDisplayName(auth.currentUser?.displayName, currentEmail);
        const emailFallbackName = sanitizeDisplayName(fallbackNameFromEmail(currentEmail), currentEmail);
        const resolvedName = profileName || suggestedName || authName || emailFallbackName;

        setProfile({
            ...(data || {}),
            ...(resolvedName ? { name: resolvedName, fullName: resolvedName } : {}),
            ...(currentEmail ? { email: currentEmail } : {}),
        });
        setLoading(false);

        // Keep profile/auth synced in the background, but never block rendering.
        if (resolvedName && profileName !== resolvedName) {
            try {
                await setDoc(doc(db, 'users', uid), {
                    name: resolvedName,
                    fullName: resolvedName,
                }, { merge: true });
            } catch {
                // Non-blocking
            }
            if (auth.currentUser && auth.currentUser.displayName !== resolvedName) {
                try {
                    await updateProfile(auth.currentUser, { displayName: resolvedName });
                } catch {
                    // Non-blocking
                }
            }
        }
    };

    const loadNotificationStatus = async () => {
        try {
            const res = await getNotificationStatus();
            setNotifStatus(res?.notifications || null);
        } catch {
            setNotifStatus(null);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            setNotifLoading(true);
            Promise.all([loadProfile(), loadNotificationStatus()])
                .finally(() => setNotifLoading(false));
        }, [])
    );

    const displayName = [
        sanitizeDisplayName(route.params?.suggestedName, user?.email),
        sanitizeDisplayName(profile?.name, user?.email),
        sanitizeDisplayName(profile?.fullName, user?.email),
        sanitizeDisplayName(profile?.full_name, user?.email),
        sanitizeDisplayName(profile?.username, user?.email),
        sanitizeDisplayName(user?.displayName, user?.email),
        sanitizeDisplayName(fallbackNameFromEmail(user?.email), user?.email),
    ].find(Boolean) || 'Account';
    const displayEmail = user?.email || profile?.email || '';
    const initial = displayName[0]?.toUpperCase() || 'A';
    const calendarType = profile?.calendarType;
    const icalUrl = profile?.calendarConfig?.icalUrl || (profile as any)?.['calendarConfig.icalUrl'];
    const calendarLinked = calendarType === 'google' || (calendarType === 'ical' && !!icalUrl);
    let calendarHost: string | null = null;
    try {
        calendarHost = icalUrl ? new URL(icalUrl).host : null;
    } catch {
        calendarHost = null;
    }

    const handleSignOut = () => {
        Alert.alert('Sign out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign out',
                style: 'destructive',
                onPress: async () => {
                    await signOut();
                    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
                },
            },
        ]);
    };

    const handleEnableNotifications = async () => {
        setNotifLoading(true);
        try {
            const token = await registerForPushNotifications();
            await loadProfile();
            await loadNotificationStatus();
            if (token) {
                Alert.alert('Notifications enabled', 'Device registered successfully.');
            } else {
                Alert.alert('Not enabled', 'Permission was not granted.');
            }
        } catch (err: any) {
            const msg = err?.message || 'Failed to enable notifications';
            if (expoGoRuntime) {
                Alert.alert('Remote push unavailable', `${msg}\n\nUse a development build to receive server notifications.`);
            } else {
                Alert.alert('Error', msg);
            }
        } finally {
            setNotifLoading(false);
        }
    };

    const handleSendTestNotification = async () => {
        setNotifTesting(true);
        try {
            if (expoGoRuntime) {
                await sendLocalTestNotification();
                Alert.alert(
                    'Local test sent',
                    'You are on Expo Go, so this sent a local device notification. For server notifications, run a development build.'
                );
                return;
            }

            const res = await sendTestNotification();
            await loadNotificationStatus();
            const receiptLine = res.receiptStatus ? `\nReceipt: ${res.receiptStatus}` : '';
            const receiptErrorLine = res.receiptError ? `\nReceipt error: ${res.receiptError}` : '';
            Alert.alert(
                'Test sent',
                `Notification sent via ${res.channel.toUpperCase()}${res.ticketId ? `\nTicket: ${res.ticketId}` : ''}${receiptLine}${receiptErrorLine}`
            );
        } catch (err: any) {
            const backendError = err?.response?.data?.error;
            Alert.alert('Test failed', backendError || err?.message || 'Failed to send test notification');
            await loadNotificationStatus();
        } finally {
            setNotifTesting(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Account</Text>

            <View style={styles.profileCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.profileTextWrap}>
                    <Text style={styles.name}>{displayName}</Text>
                    <Text style={styles.email}>{displayEmail}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Calendar</Text>
                {loading ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : (
                    <>
                        <Text style={[styles.status, { color: calendarLinked ? colors.success : colors.warning }]}>
                            {calendarLinked ? 'Linked' : 'Not linked'}
                        </Text>
                        <Text style={styles.detail}>
                            {calendarType ? `Type: ${calendarType === 'ical' ? 'iCal' : 'Google'}` : 'No calendar connected'}
                        </Text>
                        {calendarHost && <Text style={styles.detail}>Source: {calendarHost}</Text>}
                    </>
                )}

                <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => navigation.navigate('CalendarConnect')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.secondaryBtnText}>{calendarLinked ? 'Manage calendar' : 'Connect calendar'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Notifications</Text>
                {(notifLoading || loading) ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : (
                    <>
                        <Text style={[styles.status, { color: notifStatus?.enabled ? colors.success : colors.warning }]}>
                            {notifStatus?.enabled ? 'Enabled' : 'Not enabled'}
                        </Text>
                        <Text style={styles.detail}>
                            Token: {notifStatus?.tokenMasked || 'None'}
                        </Text>
                        <Text style={styles.detail}>
                            Upcoming classes: {notifStatus?.upcomingEventsCount ?? 0} · Pending reminders: {notifStatus?.pendingNotificationsCount ?? 0}
                        </Text>
                        {pushHint && (
                            <Text style={[styles.detail, { color: colors.warning }]}>
                                {pushHint}
                            </Text>
                        )}
                        {notifStatus?.lastTestSentAt && (
                            <Text style={styles.detail}>
                                Last test: {notifStatus.lastTestStatus || 'unknown'} at {new Date(notifStatus.lastTestSentAt).toLocaleString()}
                            </Text>
                        )}
                        {notifStatus?.lastTestReceiptStatus && (
                            <Text style={styles.detail}>
                                Last receipt: {notifStatus.lastTestReceiptStatus}
                            </Text>
                        )}
                        {notifStatus?.lastTestReceiptError && (
                            <Text style={[styles.detail, { color: colors.accent }]}>
                                Receipt error: {notifStatus.lastTestReceiptError}
                            </Text>
                        )}
                        {notifStatus?.lastTestError && (
                            <Text style={[styles.detail, { color: colors.accent }]}>
                                Last error: {notifStatus.lastTestError}
                            </Text>
                        )}
                    </>
                )}

                <View style={styles.notificationActions}>
                    <TouchableOpacity
                        style={styles.notificationBtn}
                        onPress={handleEnableNotifications}
                        activeOpacity={0.85}
                        disabled={notifLoading}
                    >
                        {notifLoading ? (
                            <ActivityIndicator color={colors.primary} />
                        ) : (
                            <Text style={styles.secondaryBtnText}>Enable notifications</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.notificationBtn, !notifStatus?.enabled && styles.secondaryBtnDisabled]}
                        onPress={handleSendTestNotification}
                        activeOpacity={0.85}
                        disabled={(!expoGoRuntime && !notifStatus?.enabled) || notifTesting}
                    >
                        {notifTesting ? (
                            <ActivityIndicator color={colors.primary} />
                        ) : (
                            <Text style={styles.secondaryBtnText}>
                                {expoGoRuntime ? 'Send local test notification' : 'Send test notification'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
                <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl, paddingTop: 60, gap: spacing.md },
    backBtn: { marginBottom: spacing.md },
    backIcon: { fontSize: 24, color: colors.textPrimary },
    title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
    profileCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        ...shadows.sm,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { ...typography.h4, color: '#fff' },
    profileTextWrap: { flex: 1 },
    name: { ...typography.h4, color: colors.textPrimary },
    email: { ...typography.body, color: colors.textSecondary },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        padding: spacing.lg,
        gap: spacing.xs,
        ...shadows.sm,
    },
    cardTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.xs },
    loadingRow: { paddingVertical: spacing.sm },
    status: { ...typography.bodyMedium },
    detail: { ...typography.caption, color: colors.textSecondary },
    secondaryBtn: {
        marginTop: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radii.md,
        backgroundColor: colors.background,
    },
    notificationBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radii.md,
        backgroundColor: colors.background,
    },
    secondaryBtnDisabled: { opacity: 0.55 },
    secondaryBtnText: { ...typography.bodyMedium, color: colors.textPrimary },
    notificationActions: { gap: spacing.xs },
    signOutBtn: {
        marginTop: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        backgroundColor: colors.accentLight,
    },
    signOutText: { ...typography.bodyMedium, color: colors.accent },
});
