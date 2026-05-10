import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCr1QXyjJjItUKAHsyEP2mavEAYxoO86wI",
  authDomain: "manageme-app-495815.firebaseapp.com",
  projectId: "manageme-app-495815",
  storageBucket: "manageme-app-495815.firebasestorage.app",
  messagingSenderId: "462928557210",
  appId: "1:462928557210:web:faeaad03d2f17b687c5b23",
  measurementId: "G-PNBDCHBNR1"
};

// Inicjalizacja Firebase i wyeksportowanie naszej bazy danych
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);