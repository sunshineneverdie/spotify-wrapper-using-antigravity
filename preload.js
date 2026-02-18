const { contextBridge, ipcRenderer } = require('electron');

// 1. Block Passkey/WebAuthn popups IMMEDIATELY
// We do this at the global level to catch requests even before the page fully loads
if (typeof window !== 'undefined') {
    if (navigator.credentials && navigator.credentials.get) {
        const originalGet = navigator.credentials.get;
        navigator.credentials.get = function (options) {
            if (options && (options.publicKey || options.otp)) {
                console.log('Blocked Passkey/WebAuthn request');
                return Promise.reject(new Error('WebAuthn is disabled in this browser.'));
            }
            return originalGet.call(navigator.credentials, options);
        };
        console.log('Harden Passkey blocker initialized (Immediate)');
    }

    // 2. Stealth: Hide automation signals
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
}
