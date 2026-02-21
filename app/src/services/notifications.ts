import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { auth } from './firebase';
import { updateUserPushToken } from './auth';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const registerForPushNotifications = async (): Promise<string | null> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
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
