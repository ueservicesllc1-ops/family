// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, setDoc, query, where, orderBy, limit, Timestamp, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGWOcKb5-W74oO4jZNMW4xzGDDOcSYSjo",
  authDomain: "family-b1702.firebaseapp.com",
  projectId: "family-b1702",
  storageBucket: "family-b1702.firebasestorage.app",
  messagingSenderId: "229329607388",
  appId: "1:229329607388:web:7a5127bc6c1f96b42fb219"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export {
  auth,
  db,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setDoc,
  onSnapshot,
  serverTimestamp
};
