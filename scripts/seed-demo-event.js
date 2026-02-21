#!/usr/bin/env node
/**
 * Seed a demo event into Firestore for the hackathon demo.
 * Usage: node scripts/seed-demo-event.js <USER_UID> "<Event Title>" <minutesFromNow>
 *
 * Example:
 *   node scripts/seed-demo-event.js abc123 "CS2102 Databases Lecture" 31
 */

const admin = require('firebase-admin');
const path = require('path');

// Look for service account in scripts/ or root
let serviceAccount;
try {
    serviceAccount = require('./serviceAccountKey.json');
} catch {
    try {
        serviceAccount = require('../serviceAccountKey.json');
    } catch {
        console.error('❌ serviceAccountKey.json not found.');
        console.error('   Download it from Firebase Console → Project settings → Service accounts');
        console.error('   Place it at: scripts/serviceAccountKey.json');
        process.exit(1);
    }
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function seedEvent(uid, title, minutesFromNow) {
    const startTime = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

    const eventId = `demo-${Date.now()}`;
    const docId = `${uid}_${eventId}`;

    await db.collection('events').doc(docId).set({
        userId: uid,
        eventId,
        title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        source: 'ical',
        notifiedAt: null,
        createdAt: new Date().toISOString(),
    });

    console.log(`✅ Demo event created!`);
    console.log(`   Title: ${title}`);
    console.log(`   Start: ${startTime.toLocaleTimeString()} (in ${minutesFromNow} minutes)`);
    console.log(`   Doc ID: ${docId}`);
    console.log(``);
    console.log(`💡 Now trigger the notification scheduler in Firebase Console → Functions`);
    process.exit(0);
}

const [uid, title, mins] = process.argv.slice(2);
if (!uid || !title) {
    console.error('Usage: node seed-demo-event.js <USER_UID> "<Title>" [minutesFromNow=31]');
    process.exit(1);
}

seedEvent(uid, title || 'CS2102 Databases Lecture', parseInt(mins || '31', 10));
