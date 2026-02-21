import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { colors, spacing, radii, typography, shadows } from '../constants/theme';
import { connectIcal } from '../services/api';
import { auth } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'CalendarConnect'> };

export default function CalendarConnectScreen({ navigation }: Props) {
    const [icalUrl, setIcalUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleIcalConnect = async () => {
        if (!icalUrl.trim()) return Alert.alert('Missing URL', 'Please paste your iCal URL.');
        if (!icalUrl.startsWith('http')) return Alert.alert('Invalid URL', 'URL must start with http or https.');
        setLoading(true);
        try {
            await connectIcal(icalUrl.trim());
            // Update local user doc
            const uid = auth.currentUser?.uid;
            if (uid) {
                await updateDoc(doc(db, 'users', uid), {
                    calendarType: 'ical',
                    'calendarConfig.icalUrl': icalUrl.trim(),
                });
            }
            Alert.alert('✅ Calendar connected!', 'Your iCal feed has been synced.', [
                { text: 'Continue', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] }) },
            ]);
        } catch (err: any) {
            Alert.alert('Connection failed', err.message || 'Could not connect your calendar.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.emoji}>📅</Text>
                    <Text style={styles.title}>Connect your calendar</Text>
                    <Text style={styles.subtitle}>
                        We'll remind you 30 minutes before each lecture so you can do a quick warm-up.
                    </Text>
                </View>

                {/* iCal option */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>🔗</Text>
                        <View>
                            <Text style={styles.cardTitle}>iCal Feed URL</Text>
                            <Text style={styles.cardSub}>Works with any calendar app</Text>
                        </View>
                    </View>

                    <Text style={styles.howToLabel}>How to get your URL:</Text>
                    <View style={styles.steps}>
                        {[
                            'Google Calendar → Settings → [Calendar] → Share → Get shareable link',
                            'Outlook → Calendar → Share → Copy ICS link',
                            'Apple Calendar → Share Calendar → Copy Link',
                        ].map((s, i) => (
                            <Text key={i} style={styles.step}>
                                <Text style={styles.stepNum}>{i + 1}. </Text>{s}
                            </Text>
                        ))}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="https://calendar.google.com/calendar/ical/..."
                        placeholderTextColor={colors.textMuted}
                        value={icalUrl}
                        onChangeText={setIcalUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                        multiline
                    />

                    <TouchableOpacity
                        style={styles.connectBtn}
                        onPress={handleIcalConnect}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.connectBtnText}>Connect iCal</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* OR divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Google Calendar coming soon */}
                <View style={[styles.card, styles.cardDisabled]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>🗓️</Text>
                        <View>
                            <Text style={styles.cardTitle}>Google Calendar</Text>
                            <Text style={styles.cardSub}>OAuth integration</Text>
                        </View>
                        <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonText}>Soon</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, padding: spacing.xl, paddingTop: 60 },
    header: { alignItems: 'center', marginBottom: spacing.xl },
    emoji: { fontSize: 56, marginBottom: spacing.md },
    title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    card: {
        backgroundColor: colors.surface, borderRadius: radii.xl,
        padding: spacing.lg, marginBottom: spacing.md, ...shadows.md,
    },
    cardDisabled: { opacity: 0.6 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    cardIcon: { fontSize: 28 },
    cardTitle: { ...typography.h4, color: colors.textPrimary },
    cardSub: { ...typography.caption, color: colors.textSecondary },
    howToLabel: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.xs },
    steps: { gap: 4, marginBottom: spacing.md },
    step: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
    stepNum: { color: colors.primary, fontWeight: '700' },
    input: {
        backgroundColor: colors.background, borderRadius: radii.md,
        paddingHorizontal: spacing.md, paddingVertical: spacing.md,
        ...typography.caption, color: colors.textPrimary,
        borderWidth: 1.5, borderColor: colors.border,
        marginBottom: spacing.md, minHeight: 56,
    },
    connectBtn: {
        backgroundColor: colors.primary, borderRadius: radii.md,
        paddingVertical: spacing.md, alignItems: 'center', ...shadows.sm,
    },
    connectBtnText: { ...typography.h4, color: '#fff' },
    divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.md },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { ...typography.caption, color: colors.textMuted },
    comingSoonBadge: {
        marginLeft: 'auto', backgroundColor: colors.cardPurple,
        borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2,
    },
    comingSoonText: { ...typography.label, color: colors.primary, textTransform: 'uppercase' },
    skipBtn: { alignItems: 'center', paddingVertical: spacing.lg },
    skipText: { ...typography.bodyMedium, color: colors.textMuted },
});
