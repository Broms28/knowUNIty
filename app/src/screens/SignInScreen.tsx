import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { colors, spacing, radii, typography, shadows } from '../constants/theme';
import { signInWithEmail, signUpWithEmail } from '../services/auth';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'SignIn'> };

export default function SignInScreen({ navigation }: Props) {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!email || !password) return Alert.alert('Missing fields', 'Please enter email and password.');
        if (mode === 'signup' && !name) return Alert.alert('Missing name', 'Please enter your name.');
        setLoading(true);
        try {
            if (mode === 'signin') {
                await signInWithEmail(email.trim(), password);
            } else {
                await signUpWithEmail(email.trim(), password, name.trim());
            }
            navigation.reset({ index: 0, routes: [{ name: 'CalendarConnect' }] });
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>

                <Text style={styles.title}>{mode === 'signin' ? 'Welcome back 👋' : 'Create account 🎓'}</Text>
                <Text style={styles.subtitle}>
                    {mode === 'signin' ? 'Sign in to continue' : "Let's get you set up"}
                </Text>

                {/* Form */}
                <View style={styles.form}>
                    {mode === 'signup' && (
                        <View style={styles.field}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Nico Smith"
                                placeholderTextColor={colors.textMuted}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>
                    )}
                    <View style={styles.field}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="you@uni.ac.uk"
                            placeholderTextColor={colors.textMuted}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor={colors.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Toggle */}
                <View style={styles.toggle}>
                    <Text style={styles.toggleText}>
                        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                    </Text>
                    <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                        <Text style={styles.toggleLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, padding: spacing.xl, paddingTop: 60 },
    backBtn: { marginBottom: spacing.xl },
    backIcon: { fontSize: 24, color: colors.textPrimary },
    title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
    subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
    form: { gap: spacing.md },
    field: { gap: spacing.xs },
    label: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase' },
    input: {
        backgroundColor: colors.surface, borderRadius: radii.md,
        paddingHorizontal: spacing.md, paddingVertical: spacing.md + 2,
        ...typography.body, color: colors.textPrimary,
        borderWidth: 1.5, borderColor: colors.border,
    },
    submitBtn: {
        backgroundColor: colors.primary, borderRadius: radii.lg,
        paddingVertical: spacing.md + 2, alignItems: 'center',
        marginTop: spacing.sm, ...shadows.md,
    },
    submitText: { ...typography.h4, color: '#fff' },
    toggle: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
    toggleText: { ...typography.body, color: colors.textSecondary },
    toggleLink: { ...typography.bodyMedium, color: colors.primary },
});
