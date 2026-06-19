import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDx7PNrSIjChQ5WRu5oG4wSa_gC3VgkUIg",
  authDomain: "email-summarizer-492805.firebaseapp.com",
  projectId: "email-summarizer-492805",
  storageBucket: "email-summarizer-492805.firebasestorage.app",
  messagingSenderId: "557797299865",
  appId: "1:557797299865:web:ff7ab62ccbe024be7b4a08"
};

// Initialize app
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId passed as the third parameter
const db = initializeFirestore(app, {}, "ai-studio-336b56ab-065e-4d16-9e3f-7ab0103a7257");

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Test Connection as per Critical Constraint in Skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Firestore Connection test succeeded.");
  } catch (error) {
    console.warn("Firestore validation notice (may be offline / rule restricted initially):", error);
  }
}
testConnection();

export { app, db, auth, googleProvider };
