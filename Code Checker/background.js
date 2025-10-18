// Background service worker for the extension

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Promo Code Manager extension installed');

    // Initialize storage with default settings
    chrome.storage.local.get(['autoApply', 'promoCodes'], (result) => {
        if (result.autoApply === undefined) {
            chrome.storage.local.set({ autoApply: true });
        }
        if (!result.promoCodes) {
            chrome.storage.local.set({ promoCodes: [] });
        }
    });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'codeApplied') {
        // Handle successful code application
        console.log('Code applied successfully:', request.code);

        // Update badge to show success
        chrome.action.setBadgeText({
            text: '✓',
            tabId: sender.tab.id
        });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

        // Clear badge after 3 seconds
        setTimeout(() => {
            chrome.action.setBadgeText({ text: '' });
        }, 3000);

        sendResponse({ success: true });
    }

    return true; // Keep message channel open
});

// Update badge when codes are updated
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.promoCodes) {
        const newCodes = changes.promoCodes.newValue || [];
        const unusedCount = newCodes.filter(c => !c.used).length;

        // Update badge with number of unused codes
        if (unusedCount > 0) {
            chrome.action.setBadgeText({ text: unusedCount.toString() });
            chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
    }
});