import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User,
    GoogleAuthProvider,
    signInWithCredential,
} from '@firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from '@firebase/firestore';
import { auth, db } from './firebase';

export const signUpWithEmail = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
        id: cred.user.uid,
        name,
        email,
        calendarType: null,
        calendarConfig: {},
        devicePushToken: null,
        createdAt: new Date().toISOString(),
    });
    return cred.user;
};

export const signInWithEmail = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
};

export const signInWithGoogle = async (idToken: string) => {
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    // Create user doc if it doesn't exist
    const userRef = doc(db, 'users', cred.user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        await setDoc(userRef, {
            id: cred.user.uid,
            name: cred.user.displayName || '',
            email: cred.user.email || '',
            calendarType: null,
            calendarConfig: {},
            devicePushToken: null,
            createdAt: new Date().toISOString(),
        });
    }
    return cred.user;
};

export const signOut = () => firebaseSignOut(auth);

export const subscribeToAuth = (callback: (user: User | null) => void) =>
    onAuthStateChanged(auth, callback);

export const updateUserPushToken = async (uid: string, token: string) => {
    await updateDoc(doc(db, 'users', uid), { devicePushToken: token });
};

export const getUserProfile = async (uid: string) => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
};
