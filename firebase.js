import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBAN-8riviRAdFINLYamZUO3EbFVMuO40M",
  authDomain: "bahara-investors.firebaseapp.com",
  databaseURL: "https://bahara-investors-default-rtdb.firebaseio.com",
  projectId: "bahara-investors",
  storageBucket: "bahara-investors.firebasestorage.app",
  messagingSenderId: "365837748387",
  appId: "1:365837748387:web:9d35129f039c10af559716",
  measurementId: "G-2W0T7ENZ55"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);