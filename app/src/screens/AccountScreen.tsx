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
import { doc, setDoc } from '@firebase/firestore';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Account'>;
    route: RouteProp<RootStackParamList, 'Account'>;
};

type ProfileData = {
    name?: string;
    fullName?: string;
    username?: string;
    email?: string;
    calendarType?: 'ical' | 'google' | null;
    calendarConfig?: { icalUrl?: string };
};

function sanitizeDisplayName(value?: string | null, email?: string | null) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const looksLikeEmail = /\S+@\S+\.\S+/.test(trimmed);
    if (looksLikeEmail) return '';
    if (['user', 'unknown', 'n/a'].includes(trimmed.toLowerCase())) return '';
    if (email && trimmed.toLowerCase() === email.toLowerCase()) return '';
    return trimmed;
}

export default function AccountScreen({ navigation, route }: Props) {
    const user = auth.currentUser;
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ProfileData | null>(null);

    const loadProfile = async () => {
        try {
            const uid = auth.currentUser?.uid;
            if (!uid) {
                setProfile(null);
                return;
            }
            const data = await getUserProfile(uid) as ProfileData | null;
            const currentEmail = auth.currentUser?.email || null;
            const profileName = sanitizeDisplayName(
                data?.name || data?.fullName || data?.username || null,
                currentEmail
            );
            const suggestedName = sanitizeDisplayName(route.params?.suggestedName, currentEmail);
            const authName = sanitizeDisplayName(auth.currentUser?.displayName, currentEmail);
            const resolvedName = profileName || suggestedName || authName;
            if (!profileName && resolvedName) {
                await setDoc(doc(db, 'users', uid), {
                    name: resolvedName,
                    fullName: resolvedName,
                }, { merge: true });
                setProfile({
                    ...(data || {}),
                    name: resolvedName,
                    fullName: resolvedName,
                });
                return;
            }
            setProfile(data);
        } catch {
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            loadProfile();
        }, [])
    );

    const displayName = [
        sanitizeDisplayName(route.params?.suggestedName, user?.email),
        sanitizeDisplayName(profile?.name, user?.email),
        sanitizeDisplayName(profile?.fullName, user?.email),
        sanitizeDisplayName(profile?.username, user?.email),
        sanitizeDisplayName(user?.displayName, user?.email),
    ].find(Boolean) || 'User';
    const displayEmail = user?.email || profile?.email || '';
    const initial = displayName[0]?.toUpperCase() || 'U';
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
                    {!!user?.uid && <Text style={styles.uid}>UID: {user.uid}</Text>}
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
    uid: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
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
    secondaryBtnText: { ...typography.bodyMedium, color: colors.textPrimary },
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
