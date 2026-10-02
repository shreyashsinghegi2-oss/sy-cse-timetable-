// Authentication Module for StudentLancing

let currentUser = null;

// Initialize authentication
function initAuth() {
  const { auth, db } = window.FirebaseApp.init();
  
  // Listen for auth state changes
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      console.log('User logged in:', user.email);
      
      // Check/create user document in Firestore
      await ensureUserDocument(user);
      
      // Redirect to dashboard if on login page
      if (window.location.pathname.includes('index.html') || 
          window.location.pathname.endsWith('/student-lancing/')) {
        window.location.href = '/student-lancing/dashboard.html';
      }
      
      // Update UI for logged in state
      updateAuthUI(user);
    } else {
      currentUser = null;
      console.log('No user logged in');
      
      // Redirect to login if not on login page
      const publicPages = ['index.html', 'login.html'];
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      
      if (!publicPages.includes(currentPage) && !window.location.pathname.endsWith('/student-lancing/')) {
        window.location.href = '/student-lancing/index.html';
      }
    }
  });
}

// Ensure user document exists in Firestore
async function ensureUserDocument(user) {
  const { db } = window.FirebaseApp.init();
  const userRef = db.collection(window.FirebaseApp.COLLECTIONS.USERS).doc(user.uid);
  
  try {
    const doc = await userRef.get();
    
    if (!doc.exists) {
      // Create new user document
      await userRef.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        bio: '',
        skills: [],
        hourlyRate: 0,
        location: '',
        portfolio: [],
        appliedProjects: [],
        createdProjects: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('User document created');
    }
  } catch (error) {
    console.error('Error ensuring user document:', error);
  }
}

// Update UI based on auth state
function updateAuthUI(user) {
  // Update avatar elements
  const avatarElements = document.querySelectorAll('.user-avatar');
  avatarElements.forEach(el => {
    if (user.photoURL) {
      el.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}">`;
    } else {
      el.textContent = user.displayName?.[0] || user.email?.[0]?.toUpperCase() || 'U';
    }
  });
  
  // Update name displays
  const nameElements = document.querySelectorAll('.user-name');
  nameElements.forEach(el => {
    el.textContent = user.displayName || user.email;
  });
}

// Initialize FirebaseUI
function initFirebaseUI() {
  const ui = new firebaseui.auth.AuthUI(firebase.auth());
  
  const uiConfig = {
    signInSuccessUrl: '/student-lancing/dashboard.html',
    signInOptions: [
      {
        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        customParameters: {
          prompt: 'select_account'
        }
      },
      {
        provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
        requireDisplayName: true
      }
    ],
    tosUrl: '#',
    privacyPolicyUrl: '#',
    signInFlow: 'popup'
  };
  
  ui.start('#firebaseui-auth-container', uiConfig);
}

// Sign out
async function signOut() {
  try {
    await firebase.auth().signOut();
    window.location.href = '/student-lancing/index.html';
  } catch (error) {
    console.error('Sign out error:', error);
    showToast('Error signing out', 'error');
  }
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Get current user data from Firestore
async function getCurrentUserData() {
  if (!currentUser) return null;
  
  const { db } = window.FirebaseApp.init();
  const userRef = db.collection(window.FirebaseApp.COLLECTIONS.USERS).doc(currentUser.uid);
  
  try {
    const doc = await userRef.get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

// Update user profile
async function updateUserProfile(data) {
  if (!currentUser) return false;
  
  const { db } = window.FirebaseApp.init();
  const userRef = db.collection(window.FirebaseApp.COLLECTIONS.USERS).doc(currentUser.uid);
  
  try {
    await userRef.update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Profile updated successfully', 'success');
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    showToast('Error updating profile', 'error');
    return false;
  }
}

// Export functions
window.Auth = {
  init: initAuth,
  initUI: initFirebaseUI,
  signOut,
  getCurrentUser,
  getCurrentUserData,
  updateUserProfile
};
