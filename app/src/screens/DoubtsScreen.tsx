import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, FlatList, ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, DoubtMessage } from '../types';
import { colors, spacing, radii, typography, shadows } from '../constants/theme';
import { askDoubt, getDoubtThread } from '../services/api';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Doubts'>;
    route: RouteProp<RootStackParamList, 'Doubts'>;
};

export default function DoubtsScreen({ navigation, route }: Props) {
    const { quizId, questionIndex, question } = route.params;
    const [messages, setMessages] = useState<DoubtMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingThread, setLoadingThread] = useState(true);
    const listRef = useRef<FlatList>(null);

    useEffect(() => {
        (async () => {
            setLoadingThread(true);
            try {
                const res = await getDoubtThread(quizId, questionIndex);
                const thread = Array.isArray(res?.thread) ? res.thread : [];
                setMessages(thread);
                setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 30);
            } catch {
                setMessages([]);
            } finally {
                setLoadingThread(false);
            }
        })();
    }, [quizId, questionIndex]);

    const sendMessage = async () => {
        const q = input.trim();
        if (!q || loading || loadingThread) return;
        setInput('');

        const userMsg: DoubtMessage = { role: 'user', content: q, timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);

        try {
            const res = await askDoubt(quizId, questionIndex, q);
            const aiMsg: DoubtMessage = {
                role: 'assistant',
                content: res.answer,
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, aiMsg]);
        } catch (e: any) {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: "Sorry, couldn't get an answer. Please try again.", timestamp: new Date().toISOString() },
            ]);
        } finally {
            setLoading(false);
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ask about this question</Text>
            </View>

            {/* Question context */}
            <View style={styles.questionCtx}>
                <Text style={styles.qLabel}>Q{questionIndex + 1}</Text>
                <Text style={styles.qText} numberOfLines={3}>{question}</Text>
            </View>

            {/* Chat */}
            {loadingThread ? (
                <View style={styles.threadLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.threadLoadingText}>Loading conversation...</Text>
                </View>
            ) : (
            <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={styles.chatList}
                ListEmptyComponent={() => (
                    <View style={styles.emptyChat}>
                        <Text style={styles.emptyChatEmoji}>💬</Text>
                        <Text style={styles.emptyChatText}>Ask Gemini anything about this question</Text>
                        <Text style={styles.emptyChatSub}>e.g. "Can you explain this with an example?" or "Why is option B wrong?"</Text>
                    </View>
                )}
                renderItem={({ item }) => (
                    <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                        {item.role === 'assistant' && (
                            <View style={styles.aiAvatar}>
                                <Text style={styles.aiAvatarText}>✨</Text>
                            </View>
                        )}
                        <View style={[styles.bubbleContent, item.role === 'user' ? styles.userBubbleContent : styles.aiBubbleContent]}>
                            <Text style={[styles.bubbleText, item.role === 'user' && styles.userBubbleText]}>
                                {item.content}
                            </Text>
                        </View>
                    </View>
                )}
            />
            )}

            {loading && (
                <View style={styles.typingIndicator}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.typingText}>AI is thinking...</Text>
                </View>
            )}

            {/* Input */}
            <View style={styles.inputBar}>
                <TextInput
                    style={styles.chatInput}
                    placeholder="Ask a follow-up question..."
                    placeholderTextColor={colors.textMuted}
                    value={input}
                    onChangeText={setInput}
                    multiline
                    maxLength={500}
                    returnKeyType="send"
                    onSubmitEditing={sendMessage}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!input.trim() || loading || loadingThread) && styles.sendBtnDisabled]}
                    onPress={sendMessage}
                    disabled={!input.trim() || loading || loadingThread}
                    activeOpacity={0.85}
                >
                    <Text style={styles.sendBtnText}>↑</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md,
        backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: {},
    backIcon: { fontSize: 22, color: colors.textPrimary },
    headerTitle: { ...typography.h4, color: colors.textPrimary },
    questionCtx: {
        backgroundColor: colors.cardPurple, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
        gap: spacing.xs,
    },
    qLabel: { ...typography.label, color: colors.primary, textTransform: 'uppercase' },
    qText: { ...typography.bodyMedium, color: colors.textPrimary, lineHeight: 22 },
    threadLoading: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    },
    threadLoadingText: { ...typography.caption, color: colors.textSecondary },
    chatList: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
    emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: spacing.sm },
    emptyChatEmoji: { fontSize: 48 },
    emptyChatText: { ...typography.h4, color: colors.textPrimary, textAlign: 'center' },
    emptyChatSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.xl },
    bubble: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    userBubble: { justifyContent: 'flex-end' },
    aiBubble: { justifyContent: 'flex-start' },
    aiAvatar: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: colors.primaryFaded, justifyContent: 'center', alignItems: 'center',
        flexShrink: 0,
    },
    aiAvatarText: { fontSize: 16 },
    bubbleContent: {
        maxWidth: '80%', borderRadius: radii.lg, padding: spacing.md,
    },
    userBubbleContent: { backgroundColor: colors.primary },
    aiBubbleContent: { backgroundColor: colors.surface, ...shadows.sm },
    bubbleText: { ...typography.body, color: colors.textPrimary, lineHeight: 22 },
    userBubbleText: { color: '#fff' },
    typingIndicator: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    },
    typingText: { ...typography.caption, color: colors.textSecondary },
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
        paddingHorizontal: spacing.md, paddingVertical: spacing.md,
        backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    },
    chatInput: {
        flex: 1, backgroundColor: colors.background, borderRadius: radii.lg,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        ...typography.body, color: colors.textPrimary, maxHeight: 100,
        borderWidth: 1.5, borderColor: colors.border,
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    },
    sendBtnDisabled: { backgroundColor: colors.border },
    sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
