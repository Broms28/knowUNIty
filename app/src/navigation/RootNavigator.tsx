import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';

import { RootStackParamList } from '../types';
import WelcomeScreen from '../screens/WelcomeScreen';
import SignInScreen from '../screens/SignInScreen';
import CalendarConnectScreen from '../screens/CalendarConnectScreen';
import HomeScreen from '../screens/HomeScreen';
import AccountScreen from '../screens/AccountScreen';
import WarmUpScreen from '../screens/WarmUpScreen';
import QuizScreen from '../screens/QuizScreen';
import ResultsScreen from '../screens/ResultsScreen';
import DoubtsScreen from '../screens/DoubtsScreen';
import QuizReviewScreen from '../screens/QuizReviewScreen';
import QuizHistoryScreen from '../screens/QuizHistoryScreen';

const Stack = createStackNavigator<RootStackParamList>();

const prefix = Linking.createURL('/');

const linking = {
    prefixes: [prefix, 'knowunity://'],
    config: {
        screens: {
            WarmUp: 'warmup',
            Home: 'home',
            Quiz: 'quiz',
        },
    },
};

export default function RootNavigator() {
    return (
        <NavigationContainer linking={linking}>
            <Stack.Navigator
                initialRouteName="Welcome"
                screenOptions={{
                    headerShown: false,
                    cardStyle: { backgroundColor: '#F8F7FF' },
                }}
            >
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="SignIn" component={SignInScreen} />
                <Stack.Screen name="CalendarConnect" component={CalendarConnectScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Account" component={AccountScreen} />
                <Stack.Screen name="WarmUp" component={WarmUpScreen} />
                <Stack.Screen name="Quiz" component={QuizScreen} />
                <Stack.Screen name="Results" component={ResultsScreen} />
                <Stack.Screen name="QuizReview" component={QuizReviewScreen} />
                <Stack.Screen name="QuizHistory" component={QuizHistoryScreen} />
                <Stack.Screen name="Doubts" component={DoubtsScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
