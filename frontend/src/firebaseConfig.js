import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAwUmihre7kwdlxThwiznaI6DRFYFj5-lA",
  authDomain: "rentora-ai.firebaseapp.com",
  projectId: "rentora-ai",
  storageBucket: "rentora-ai.firebasestorage.app",
  messagingSenderId: "78493982833",
  appId: "1:78493982833:web:5797591782a3da4a457bd0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();