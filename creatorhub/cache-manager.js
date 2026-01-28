// cache-manager.js - localStorage Cache Manager
// Smart cache: Longer expiry (1 hour) + manual refresh option

class CacheManager {
    constructor() {
        this.CACHE_KEY = 'creator_hub_cache';
        this.CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour (was 5 minutes)
        console.log('💾 CacheManager initialized - 1 hour expiry');
    }
    
    // Get cache data
    get(key) {
        try {
            const cacheData = localStorage.getItem(this.CACHE_KEY);
            if (!cacheData) return null;
            
            const cache = JSON.parse(cacheData);
            const item = cache[key];
            
            if (!item) return null;
            
            // Check if expired
            const now = Date.now();
            const age = now - item.timestamp;
            
            if (age > this.CACHE_EXPIRY) {
                console.log(`⏰ Cache expired for ${key}`);
                this.delete(key);
                return null;
            }
            
            console.log(`✅ Cache hit for ${key} (age: ${Math.round(age/1000)}s)`);
            return item.data;
            
        } catch (error) {
            console.error('Cache read error:', error);
            return null;
        }
    }
    
    // Set cache data
    set(key, data) {
        try {
            const cacheData = localStorage.getItem(this.CACHE_KEY);
            const cache = cacheData ? JSON.parse(cacheData) : {};
            
            cache[key] = {
                data: data,
                timestamp: Date.now()
            };
            
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
            console.log(`💾 Cached ${key}`);
            
        } catch (error) {
            console.error('Cache write error:', error);
        }
    }
    
    // Delete specific cache key
    delete(key) {
        try {
            const cacheData = localStorage.getItem(this.CACHE_KEY);
            if (!cacheData) return;
            
            const cache = JSON.parse(cacheData);
            delete cache[key];
            
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
            console.log(`🗑️ Deleted cache for ${key}`);
            
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }
    
    // Clear all cache
    clear() {
        try {
            localStorage.removeItem(this.CACHE_KEY);
            console.log('🗑️ All cache cleared');
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }
    
    // Check if cache is valid for a key
    isValid(key) {
        return this.get(key) !== null;
    }
    
    // Get cache stats
    getStats() {
        try {
            const cacheData = localStorage.getItem(this.CACHE_KEY);
            if (!cacheData) return { keys: 0, size: 0 };
            
            const cache = JSON.parse(cacheData);
            const keys = Object.keys(cache).length;
            const size = new Blob([cacheData]).size;
            
            return {
                keys: keys,
                size: size,
                sizeKB: (size / 1024).toFixed(2)
            };
        } catch (error) {
            return { keys: 0, size: 0 };
        }
    }
}

// Global instance
const cacheManager = new CacheManager();
