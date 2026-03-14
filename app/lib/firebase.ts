import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBI6vJ7kIP8zH9pCWOfCzI9xgK2Uu9PNOc",
  authDomain: "zhiyou-ai-25442.firebaseapp.com",
  projectId: "zhiyou-ai-25442",
  storageBucket: "zhiyou-ai-25442.firebasestorage.app",
  messagingSenderId: "595901590774",
  appId: "1:595901590774:web:1e7f6f2529536280f210d7"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
