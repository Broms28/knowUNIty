import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    useEffect(() => {
        // Handle notifications received while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            console.log('Notification received:', notification);
        });

        // Handle notification tap → deep link
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const url = response.notification.request.content.data?.url as string | undefined;
            if (url) {
                Linking.openURL(url);
            }
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <RootNavigator />
        </GestureHandlerRootView>
    );
}
