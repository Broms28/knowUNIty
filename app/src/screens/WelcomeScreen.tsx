import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    ImageBackground,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { colors, spacing, radii, typography, shadows } from '../constants/theme';
import { subscribeToAuth } from '../services/auth';

const { width, height } = Dimensions.get('window');

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Welcome'>;
};

export default function WelcomeScreen({ navigation }: Props) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        // Check if user already signed in
        const unsub = subscribeToAuth((user) => {
            if (user) {
                navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
            } else {
                setChecking(false);
                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                    Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
                ]).start();
            }
        });
        return unsub;
    }, []);

    if (checking) return null;

    return (
        <View style={styles.container}>
            {/* Gradient background circles */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoIcon}>
                        <Text style={styles.logoEmoji}>🎓</Text>
                    </View>
                    <Text style={styles.logoText}>
                        Know<Text style={styles.logoTextAccent}>UNI</Text>ty
                    </Text>
                    <Text style={styles.tagline}>Micro-revision before every class</Text>
                </View>

                {/* Feature pills */}
                <View style={styles.pills}>
                    {[
                        { icon: '📅', text: 'Syncs your calendar' },
                        { icon: '🔔', text: '30-min reminders' },
                        { icon: '🤖', text: 'AI-powered quizzes' },
                    ].map((item, i) => (
                        <View key={i} style={styles.pill}>
                            <Text style={styles.pillEmoji}>{item.icon}</Text>
                            <Text style={styles.pillText}>{item.text}</Text>
                        </View>
                    ))}
                </View>

                {/* CTA */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('SignIn', { initialMode: 'signup' })}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryButtonText}>Get Started</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => navigation.navigate('SignIn', { initialMode: 'signin' })}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.secondaryButtonText}>I already have an account</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bgCircle1: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: colors.primaryFaded,
        top: -120,
        right: -100,
    },
    bgCircle2: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#E8F0FE',
        bottom: -80,
        left: -80,
    },
    content: {
        width: '100%',
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    logoIcon: {
        width: 88,
        height: 88,
        borderRadius: radii.xl,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
        ...shadows.lg,
    },
    logoEmoji: {
        fontSize: 44,
    },
    logoText: {
        ...typography.h1,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    logoTextAccent: {
        color: colors.primary,
    },
    tagline: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    pills: {
        width: '100%',
        gap: spacing.sm,
        marginBottom: spacing.xxl,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        ...shadows.sm,
    },
    pillEmoji: { fontSize: 22 },
    pillText: { ...typography.bodyMedium, color: colors.textPrimary },
    actions: {
        width: '100%',
        gap: spacing.md,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: radii.lg,
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
        ...shadows.md,
    },
    primaryButtonText: {
        ...typography.h4,
        color: colors.textOnPrimary,
    },
    secondaryButton: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    secondaryButtonText: {
        ...typography.bodyMedium,
        color: colors.primary,
    },
});
