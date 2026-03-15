import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, collection, serverTimestamp, setDoc, updateDoc, getDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const addTask = async (userId: string, prompt: string, aspectRatio: string) => {
  const taskRef = doc(collection(db, 'image_tasks'));
  await setDoc(taskRef, {
    userId,
    prompt,
    aspectRatio,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return taskRef.id;
};

export const getTask = async (taskId: string) => {
  const taskDoc = await getDoc(doc(db, 'image_tasks', taskId));
  return taskDoc.exists() ? { id: taskDoc.id, ...taskDoc.data() } : null;
};
