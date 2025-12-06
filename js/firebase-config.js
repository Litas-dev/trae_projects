// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBzlgeoOSAT34B_nadzDj5s-KGwTzXXmaY",
    authDomain: "authapp-bbd56.firebaseapp.com",
    projectId: "authapp-bbd56",
    databaseURL: "https://authapp-bbd56-default-rtdb.europe-west1.firebasedatabase.app",
    storageBucket: "authapp-bbd56.firebasestorage.app",
    messagingSenderId: "534003745282",
    appId: "1:534003745282:web:aa6046d3155fa63df65d1b",
    measurementId: "G-BR5VXJCC3R"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get references to Firebase services
const auth = firebase.auth();
const database = firebase.database();

console.log('Firebase initialized successfully!');
