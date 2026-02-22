import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User,
    GoogleAuthProvider,
    signInWithCredential,
    updateProfile,
} from '@firebase/auth';
import { doc, setDoc, getDoc } from '@firebase/firestore';
import { auth, db } from './firebase';

const looksLikeEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

const normalizeName = (value?: string | null, email?: string | null) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    if (looksLikeEmail(trimmed)) return '';
    if (['user', 'unknown', 'n/a'].includes(trimmed.toLowerCase())) return '';
    if (email && trimmed.toLowerCase() === email.toLowerCase()) return '';
    return trimmed;
};

const ensureUserProfileDoc = async (user: User, fallbackName?: string) => {
    const now = new Date().toISOString();
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const authName = normalizeName(user.displayName, user.email);
    const explicitFallbackName = normalizeName(fallbackName, user.email);

    if (!snap.exists()) {
        const chosenName = explicitFallbackName || authName;
        if (chosenName && user.displayName !== chosenName) {
            try {
                await updateProfile(user, { displayName: chosenName });
            } catch {
                // Non-blocking: profile doc remains source of truth for name.
            }
        }
        await setDoc(userRef, {
            id: user.uid,
            name: chosenName,
            fullName: chosenName,
            email: user.email || '',
            calendarType: null,
            calendarConfig: {},
            devicePushToken: null,
            createdAt: now,
            lastLoginAt: now,
        }, { merge: true });
        return;
    }

    const patch: Record<string, any> = {
        id: user.uid,
        lastLoginAt: now,
    };
    const existingName = normalizeName(
        String(snap.data()?.name || snap.data()?.fullName || snap.data()?.username || '').trim(),
        user.email
    );
    const chosenName = explicitFallbackName || existingName || authName;
    if (chosenName) {
        patch.name = chosenName;
        patch.fullName = chosenName;
    }
    if (user.email) patch.email = user.email;

    await setDoc(userRef, patch, { merge: true });

    if (chosenName && user.displayName !== chosenName) {
        try {
            await updateProfile(user, { displayName: chosenName });
        } catch {
            // Non-blocking update.
        }
    }
};

export const signUpWithEmail = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const normalizedName = normalizeName(name, email);
    if (normalizedName) {
        try {
            await updateProfile(cred.user, { displayName: normalizedName });
        } catch {
            // Keep signup successful even if profile sync fails transiently.
        }
    }
    await setDoc(doc(db, 'users', cred.user.uid), {
        id: cred.user.uid,
        name: normalizedName,
        fullName: normalizedName,
        email,
        calendarType: null,
        calendarConfig: {},
        devicePushToken: null,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
    });
    return cred.user;
};

export const signInWithEmail = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserProfileDoc(cred.user);
    return cred.user;
};

export const signInWithGoogle = async (idToken: string) => {
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    await ensureUserProfileDoc(cred.user);
    return cred.user;
};

export const signOut = () => firebaseSignOut(auth);

export const subscribeToAuth = (callback: (user: User | null) => void) =>
    onAuthStateChanged(auth, callback);

export const updateUserPushToken = async (uid: string, token: string) => {
    await setDoc(doc(db, 'users', uid), { devicePushToken: token }, { merge: true });
};

export const getUserProfile = async (uid: string) => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
};
