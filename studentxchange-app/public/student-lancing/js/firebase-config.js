// Firebase Configuration for StudentLancing
// Uses the same Firebase project as StudentCollab but with separate collections

// Initialize Firebase
let app, auth, db, storage;

function initializeFirebase() {
  // Get config at initialization time (after API fetch completes)
  const firebaseConfig = {
    apiKey: window.FIREBASE_CONFIG?.apiKey || "",
    authDomain: window.FIREBASE_CONFIG?.authDomain || "",
    projectId: window.FIREBASE_CONFIG?.projectId || "",
    storageBucket: window.FIREBASE_CONFIG?.storageBucket || "",
    messagingSenderId: window.FIREBASE_CONFIG?.messagingSenderId || "",
    appId: window.FIREBASE_CONFIG?.appId || "",
    measurementId: window.FIREBASE_CONFIG?.measurementId || ""
  };
  
  console.log('Initializing Firebase with config:', firebaseConfig.projectId);
  
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
  } else {
    app = firebase.app();
  }
  
  auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();
  
  console.log('Firebase initialized for StudentLancing');
  return { app, auth, db, storage };
}

// Collection references for StudentLancing
const COLLECTIONS = {
  USERS: 'SL_users',
  PROJECTS: 'SL_projects',
  APPLICATIONS: 'SL_applications',
  MESSAGES: 'SL_messages',
  PORTFOLIOS: 'SL_portfolios'
};

// Helper function to get collection reference
function getCollection(collectionName) {
  return db.collection(collectionName);
}

// Export for use in other modules
window.FirebaseApp = {
  init: initializeFirebase,
  getAuth: () => auth,
  getDb: () => db,
  getStorage: () => storage,
  COLLECTIONS
};
