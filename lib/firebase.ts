import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

// const firebaseConfig = {
//   apiKey: 'AIzaSyCf7JCvmeQ-U5vI3P6NtCz0dcBgqjAJ2ok',
//   authDomain: 'ghost-rentals-dcd2b.firebaseapp.com',
//   projectId: 'ghost-rentals-dcd2b',
//   storageBucket: 'ghost-rentals-dcd2b.firebasestorage.app',
//   messagingSenderId: '282342682389',
//   appId: '1:282342682389:web:28315963f9cee47d66c31c',
//   measurementId: 'G-1JBZRQRNHB'
// }

const firebaseConfig = {
  apiKey: "AIzaSyBLRk9B-40vGSXZc-ogoknyw4cACURApNM",
  authDomain: "test-project-a54ee.firebaseapp.com",
  projectId: "test-project-a54ee",
  storageBucket: 'ghost-rentals-dcd2b.appspot.com',
  messagingSenderId: "391175824097",
  appId: "1:391175824097:web:3721f371c1df099fb18da0",
  measurementId: "G-NC60KQ3N7B"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const firebaseAuth = getAuth(app)
firebaseAuth.useDeviceLanguage()




// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyBLRk9B-40vGSXZc-ogoknyw4cACURApNM",
//   authDomain: "test-project-a54ee.firebaseapp.com",
//   projectId: "test-project-a54ee",
//   storageBucket: "test-project-a54ee.firebasestorage.app",
//   messagingSenderId: "391175824097",
//   appId: "1:391175824097:web:3721f371c1df099fb18da0",
//   measurementId: "G-NC60KQ3N7B"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);