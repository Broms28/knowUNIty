import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { colors, spacing, radii, typography, shadows } from '../constants/theme';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'WarmUp'>;
    route: RouteProp<RootStackParamList, 'WarmUp'>;
};

const MODES = [
    { key: 'quick' as const, label: 'Quick', desc: '5 questions · ~3 min', icon: '⚡' },
    { key: 'extended' as const, label: 'Extended', desc: '15 questions · ~10 min', icon: '📚' },
];

export default function WarmUpScreen({ navigation, route }: Props) {
    const { eventId, eventTitle } = route.params || {};
    const [topic, setTopic] = useState('');
    const [mode, setMode] = useState<'quick' | 'extended'>('quick');

    const handleStart = () => {
        const t = topic.trim();
        if (!t) return Alert.alert('Topic needed', 'What topic are you about to cover?');
        if (t.length > 200) return Alert.alert('Too long', 'Keep topic under 200 characters.');
        navigation.navigate('Quiz', { topic: t, mode, eventId });
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Back */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>

                {/* Event context */}
                {eventTitle && (
                    <View style={styles.eventBanner}>
                        <Text style={styles.eventBannerEmoji}>📅</Text>
                        <Text style={styles.eventBannerText} numberOfLines={1}>{eventTitle}</Text>
                    </View>
                )}

                <Text style={styles.title}>What's the topic?</Text>
                <Text style={styles.subtitle}>Tell us what you're about to cover and we'll generate a warm-up quiz.</Text>

                {/* Topic input */}
                <View style={styles.inputCard}>
                    <TextInput
                        style={styles.input}
                        placeholder={eventTitle
                            ? `e.g. topics from ${eventTitle}`
                            : 'e.g. B-trees, SQL joins, React hooks'}
                        placeholderTextColor={colors.textMuted}
                        value={topic}
                        onChangeText={setTopic}
                        multiline
                        maxLength={200}
                        autoFocus
                    />
                    <Text style={styles.charCount}>{topic.length}/200</Text>
                </View>

                {/* Mode selector */}
                <Text style={styles.sectionLabel}>Choose a mode</Text>
                <View style={styles.modeGrid}>
                    {MODES.map((m) => (
                        <TouchableOpacity
                            key={m.key}
                            style={[styles.modeCard, mode === m.key && styles.modeCardActive]}
                            onPress={() => setMode(m.key)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.modeIcon}>{m.icon}</Text>
                            <Text style={[styles.modeLabel, mode === m.key && styles.modeLabelActive]}>{m.label}</Text>
                            <Text style={[styles.modeDesc, mode === m.key && styles.modeDescActive]}>{m.desc}</Text>
                            {mode === m.key && <View style={styles.modeCheck}><Text style={styles.modeCheckText}>✓</Text></View>}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Generate */}
                <TouchableOpacity style={styles.generateBtn} onPress={handleStart} activeOpacity={0.85}>
                    <Text style={styles.generateBtnText}>Generate Quiz 🚀</Text>
                </TouchableOpacity>

                <Text style={styles.geminiNote}>Powered by Gemini AI · Questions tailored to your topic</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, padding: spacing.xl, paddingTop: 60, gap: spacing.md },
    backBtn: { marginBottom: spacing.sm },
    backIcon: { fontSize: 24, color: colors.textPrimary },
    eventBanner: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.cardPurple, borderRadius: radii.md,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    eventBannerEmoji: { fontSize: 18 },
    eventBannerText: { ...typography.bodyMedium, color: colors.primary, flex: 1 },
    title: { ...typography.h2, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
    inputCard: {
        backgroundColor: colors.surface, borderRadius: radii.xl,
        padding: spacing.md, ...shadows.sm,
    },
    input: {
        ...typography.body, color: colors.textPrimary,
        minHeight: 80, textAlignVertical: 'top',
    },
    charCount: { ...typography.caption, color: colors.textMuted, textAlign: 'right', marginTop: spacing.xs },
    sectionLabel: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase' },
    modeGrid: { flexDirection: 'row', gap: spacing.md },
    modeCard: {
        flex: 1, backgroundColor: colors.surface, borderRadius: radii.xl,
        padding: spacing.lg, gap: spacing.xs, borderWidth: 2, borderColor: 'transparent', ...shadows.sm,
    },
    modeCardActive: {
        borderColor: colors.primary, backgroundColor: colors.primaryFaded,
    },
    modeIcon: { fontSize: 28 },
    modeLabel: { ...typography.h4, color: colors.textPrimary },
    modeLabelActive: { color: colors.primary },
    modeDesc: { ...typography.caption, color: colors.textSecondary },
    modeDescActive: { color: colors.primaryLight },
    modeCheck: {
        position: 'absolute', top: spacing.sm, right: spacing.sm,
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    },
    modeCheckText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    generateBtn: {
        backgroundColor: colors.primary, borderRadius: radii.lg,
        paddingVertical: spacing.md + 2, alignItems: 'center', ...shadows.md,
        marginTop: spacing.sm,
    },
    generateBtnText: { ...typography.h4, color: '#fff' },
    geminiNote: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
