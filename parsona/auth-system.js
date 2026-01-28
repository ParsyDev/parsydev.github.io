// auth-system.js - Add Authentication & Cache to Creator Hub
// Just include this file AFTER app.js in your HTML!

// ============================================
// AUTH MANAGER
// ============================================
class AuthManager {
    constructor() {
        this.SESSION_KEY = 'creator_hub_session';
        this.currentSession = null;
        this.init();
    }
    
    init() {
        // Try to restore session
        this.restoreSession();
        console.log('🔐 AuthManager initialized');
    }
    
    // Create account (encrypt private data)
    async createAccount(name, password, publicData, privateData = {}) {
        try {
            // Hash password for verification
            const passwordHash = await cryptoHelper.hashPassword(password);
            
            // Encrypt private data
            const encryptedPrivateData = await cryptoHelper.encrypt(password, privateData);
            
            // Combine public + encrypted private
            const profileData = {
                ...publicData,
                passwordHash: passwordHash,
                encryptedData: encryptedPrivateData
            };
            
            return profileData;
            
        } catch (error) {
            console.error('Account creation failed:', error);
            throw error;
        }
    }
    
    // Login (verify password + decrypt private data)
    async login(profileData, password) {
        try {
            // Hash input password
            const inputHash = await cryptoHelper.hashPassword(password);
            
            // Compare with stored hash
            if (inputHash !== profileData.passwordHash) {
                throw new Error('Wrong password');
            }
            
            // Decrypt private data
            let privateData = {};
            if (profileData.encryptedData) {
                privateData = await cryptoHelper.decrypt(password, profileData.encryptedData);
            }
            
            // Create session
            this.currentSession = {
                password: password, // Keep in memory for updates
                publicData: profileData,
                privateData: privateData
            };
            
            return {
                success: true,
                privateData: privateData
            };
            
        } catch (error) {
            console.error('Login failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Update account (re-encrypt with password)
    async updateAccount(publicData, privateData) {
        if (!this.currentSession) {
            throw new Error('Not logged in');
        }
        
        // Re-encrypt private data with same password
        const encryptedPrivateData = await cryptoHelper.encrypt(
            this.currentSession.password,
            privateData
        );
        
        // Update password hash (in case password changed)
        const passwordHash = await cryptoHelper.hashPassword(this.currentSession.password);
        
        return {
            ...publicData,
            passwordHash: passwordHash,
            encryptedData: encryptedPrivateData
        };
    }
    
    // Save session to sessionStorage (temporary, cleared on browser close)
    saveSession(profileId, profileName) {
        if (!this.currentSession) return;
        
        const sessionData = {
            profileId: profileId,
            profileName: profileName,
            timestamp: Date.now()
        };
        
        try {
            sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
            console.log('💾 Session saved');
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }
    
    // Restore session
    restoreSession() {
        try {
            const sessionData = sessionStorage.getItem(this.SESSION_KEY);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                console.log('🔄 Session restored:', session.profileName);
                return session;
            }
        } catch (error) {
            console.error('Failed to restore session:', error);
        }
        return null;
    }
    
    // Logout
    logout() {
        this.currentSession = null;
        sessionStorage.removeItem(this.SESSION_KEY);
        console.log('🚪 Logged out');
    }
    
    // Check if logged in
    isLoggedIn() {
        return this.currentSession !== null;
    }
}

// ============================================
// EXTEND EXISTING APP.JS FUNCTIONS
// ============================================

// Global instances
const authManager = new AuthManager();

// Store original functions
const _originalLoadAllProfiles = typeof loadAllProfiles !== 'undefined' ? loadAllProfiles : null;
const _originalLoadRegistry = typeof loadRegistry !== 'undefined' ? loadRegistry : null;
const _originalLoadProfile = typeof loadProfile !== 'undefined' ? loadProfile : null;

// ============================================
// CACHED REGISTRY LOADING
// ============================================
if (_originalLoadRegistry) {
    window.loadRegistry = async function() {
        // Try cache first
        const cached = cacheManager.get('registry');
        if (cached) {
            registry = cached;
            console.log('✅ Registry loaded from cache');
            return;
        }
        
        // Load from API
        await _originalLoadRegistry();
        
        // Cache it
        cacheManager.set('registry', registry);
    };
}

// ============================================
// CACHED PROFILE LOADING
// ============================================
if (_originalLoadProfile) {
    window.loadProfile = async function(id) {
        // Try cache first
        const cacheKey = `profile_${id}`;
        const cached = cacheManager.get(cacheKey);
        if (cached) {
            console.log(`✅ Profile ${id} loaded from cache`);
            return cached;
        }
        
        // Load from API
        const profile = await _originalLoadProfile(id);
        
        // Cache it
        cacheManager.set(cacheKey, profile);
        
        return profile;
    };
}

// ============================================
// CACHED BROWSE PROFILES
// ============================================
if (_originalLoadAllProfiles) {
    window.loadAllProfiles = async function() {
        // Show loading
        if (typeof els !== 'undefined' && els.grid) {
            els.grid.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">Loading...</div>';
        }
        
        // Call original with caching
        await _originalLoadAllProfiles();
        
        // Show cache stats
        const stats = cacheManager.getStats();
        console.log(`📊 Cache: ${stats.keys} items, ${stats.sizeKB}KB`);
    };
}

// ============================================
// ENHANCED CREATE PROFILE WITH ENCRYPTION
// ============================================
window.createProfileWithAuth = async function(formData) {
    const { name, password, description, imageUrl, streamUrl, ...otherPublicData } = formData;
    
    // Separate public and private data
    const publicData = {
        name: name,
        description: description,
        imageUrl: imageUrl,
        streamUrl: streamUrl,
        ...otherPublicData,
        createdAt: new Date().toISOString()
    };
    
    const privateData = {
        email: formData.email || '', // If you add email field
        notes: formData.notes || ''   // Private notes
    };
    
    // Create account with encryption
    const profileData = await authManager.createAccount(
        name,
        password,
        publicData,
        privateData
    );
    
    return profileData;
};

// ============================================
// ENHANCED LOGIN
// ============================================
window.loginWithAuth = async function(profileId, password) {
    // Load profile
    const profile = await loadProfile(profileId);
    
    // Login (verify + decrypt)
    const result = await authManager.login(profile, password);
    
    if (result.success) {
        // Save session
        authManager.saveSession(profileId, profile.name);
        
        // Update UI
        if (typeof currentUser !== 'undefined') {
            currentUser = {
                id: profileId,
                name: profile.name,
                privateData: result.privateData
            };
        }
        
        console.log('✅ Logged in successfully');
    }
    
    return result;
};

// ============================================
// CACHE UTILITIES
// ============================================
window.clearCache = function() {
    cacheManager.clear();
    console.log('🗑️ Cache cleared! Reload to fetch fresh data.');
};

window.getCacheStats = function() {
    const stats = cacheManager.getStats();
    console.log(`📊 Cache Statistics:`);
    console.log(`   Items: ${stats.keys}`);
    console.log(`   Size: ${stats.sizeKB}KB`);
    return stats;
};

// ============================================
// AUTO SESSION RESTORE
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    const session = authManager.restoreSession();
    if (session) {
        console.log(`👤 Welcome back, ${session.profileName}!`);
        // Auto-login logic here if needed
    }
});

console.log('🚀 Auth & Cache system loaded!');
console.log('💡 Use clearCache() to clear cache manually');
console.log('💡 Use getCacheStats() to see cache info');
