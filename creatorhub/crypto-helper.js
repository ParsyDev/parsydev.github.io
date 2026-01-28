// crypto-helper.js - Client-Side Encryption Helper
// Zero-knowledge encryption: Keys never leave the browser!

class CryptoHelper {
    constructor() {
        console.log('🔐 CryptoHelper initialized');
    }
    
    // Hash password for storage/comparison (one-way function)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return this.arrayBufferToHex(hash);
    }
    
    // Derive encryption key from password (deterministic)
    async deriveKey(password, salt = 'creator-hub-v1-salt') {
        const encoder = new TextEncoder();
        const passwordData = encoder.encode(password);
        const saltData = encoder.encode(salt);
        
        // Import password as key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordData,
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );
        
        // Derive encryption key using PBKDF2 (100k iterations for security)
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltData,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }
    
    // Encrypt data with password
    async encrypt(password, data) {
        try {
            const key = await this.deriveKey(password);
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(JSON.stringify(data));
            
            // Generate random IV (initialization vector)
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Encrypt with AES-GCM
            const encryptedData = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encodedData
            );
            
            // Return IV + encrypted data as hex strings
            return {
                iv: this.arrayBufferToHex(iv),
                data: this.arrayBufferToHex(encryptedData)
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Encryption failed');
        }
    }
    
    // Decrypt data with password
    async decrypt(password, encryptedObj) {
        try {
            const key = await this.deriveKey(password);
            const iv = this.hexToArrayBuffer(encryptedObj.iv);
            const encryptedData = this.hexToArrayBuffer(encryptedObj.data);
            
            // Decrypt with AES-GCM
            const decryptedData = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encryptedData
            );
            
            const decoder = new TextDecoder();
            const jsonString = decoder.decode(decryptedData);
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Wrong password or corrupted data');
        }
    }
    
    // Helper: Convert ArrayBuffer to hex string
    arrayBufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    // Helper: Convert hex string to ArrayBuffer
    hexToArrayBuffer(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes.buffer;
    }
}

// Global instance
const cryptoHelper = new CryptoHelper();
