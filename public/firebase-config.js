/************************
* firebase-config.js v1.1
* - Fix: Corrected a syntax error in the version comment block.
************************/

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs, doc, updateDoc, writeBatch, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDAbOiTIQB6FFpFA7ULaN4ZfjqKF_IL7P0",
    authDomain: "tripcheck-avielk.firebaseapp.com",
    projectId: "tripcheck-avielk",
    storageBucket: "tripcheck-avielk.appspot.com",
    messagingSenderId: "1067609414447",
    appId: "1:1067609414447:web:2a7dd6a1cc95d10b781fda"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Export Firebase services and functions
export { 
    auth, db, provider,
    onAuthStateChanged, signInWithPopup, signOut,
    collection, addDoc, serverTimestamp, query, where, 
    onSnapshot, getDocs, doc, updateDoc, writeBatch, deleteDoc
};
