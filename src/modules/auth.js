// Authentication Module
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from '../config/firebase-config.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.onAuthChangeCallbacks = [];
    }

    // Initialize auth state listener
    init() {
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            this.onAuthChangeCallbacks.forEach(callback => callback(user));

            if (user) {
                this.showApp();
            } else {
                this.showLogin();
            }
        });
    }

    // Register callback for auth state changes
    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);
    }

    // Sign in with Google
    async signInWithGoogle() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    }

    // Sign out
    async logout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }

    // Show login screen
    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }

    // Show app
    showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';

        // Update user info
        if (this.currentUser) {
            const userNameEl = document.getElementById('user-name');
            const userEmailEl = document.getElementById('user-email');
            const userPhotoEl = document.getElementById('user-photo');

            if (userNameEl) userNameEl.textContent = this.currentUser.displayName || 'Usuario';
            if (userEmailEl) userEmailEl.textContent = this.currentUser.email || '';
            if (userPhotoEl && this.currentUser.photoURL) {
                userPhotoEl.src = this.currentUser.photoURL;
            }
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }
}

export default new AuthManager();
