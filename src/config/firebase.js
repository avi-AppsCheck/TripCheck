import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDAbOiTIQB6FFpFA7ULaN4ZfjqKF_IL7P0",
    authDomain: "tripcheck-avielk.firebaseapp.com",
    projectId: "tripcheck-avielk",
    storageBucket: "tripcheck-avielk.appspot.com",
    messagingSenderId: "1067609414447",
    appId: "1:1067609414447:web:2a7dd6a1cc95d10b781fda"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider };
