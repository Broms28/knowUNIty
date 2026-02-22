import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { auth } from './firebase';
import { updateUserPushToken } from './auth';

Notifications.setNotificationHandler({
    handleNotification: async () =>
        ({
            // Backward-compatible key used by older expo-notifications.
            shouldShowAlert: true,
            // Newer iOS presentation options.
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        } as any),
});

export const isExpoGoRuntime = (): boolean => {
    const executionEnvironment = String((Constants as any)?.executionEnvironment || '').toLowerCase();
    const appOwnership = String((Constants as any)?.appOwnership || '').toLowerCase();
    return executionEnvironment === 'storeclient' || appOwnership === 'expo';
};

export const getPushSupportHint = (): string | null => {
    if (!isExpoGoRuntime()) return null;
    return 'You are running in Expo Go. Remote push notifications require an iOS development build.';
};

export const registerForPushNotifications = async (): Promise<string | null> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync(
            Platform.OS === 'ios'
                ? {
                    ios: {
                        allowAlert: true,
                        allowBadge: true,
                        allowSound: true,
                    },
                }
                : undefined
        );
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
    }

    if (isExpoGoRuntime()) {
        throw new Error('Remote push notifications are not supported in Expo Go. Build and run a development client.');
    }

    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID ||
        (Constants as any)?.easConfig?.projectId ||
        (Constants as any)?.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
        throw new Error('Expo projectId is missing. Set EXPO_PUBLIC_PROJECT_ID in app/.env');
    }

    const token = (await Notifications.getExpoPushTokenAsync({
        projectId,
    })).data;

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6C47FF',
        });
    }

    // Store token in Firestore
    const user = auth.currentUser;
    if (user && token) {
        await updateUserPushToken(user.uid, token);
    }

    return token;
};

export const sendLocalTestNotification = async (message?: string) => {
    return Notifications.scheduleNotificationAsync({
        content: {
            title: 'KnowUNIty local test ✅',
            body: message || 'Local notification is working on this device.',
            sound: 'default',
            data: { type: 'local-test', url: 'knowunity://home' },
        },
        trigger: { seconds: 2 } as any,
    });
};
