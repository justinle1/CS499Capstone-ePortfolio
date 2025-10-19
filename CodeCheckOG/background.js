// Background script for the checkout auto-fill extension
class BackgroundManager {
  constructor() {
    this.init();
  }

  init() {
    // Listen for extension installation
    browser.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.onInstall();
      }
    });

    // Listen for messages from content scripts
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }

  onInstall() {
    // Set default settings
    browser.storage.local.set({
      promoCodes: [],
      giftCards: [],
      isEnabled: true
    });
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_SETTINGS':
        this.getSettings().then(sendResponse);
        return true; // Will respond asynchronously
        
      case 'SAVE_SETTINGS':
        this.saveSettings(message.data).then(sendResponse);
        return true;
        
      case 'MARK_CODE_USED':
        this.markCodeAsUsed(message.code).then(sendResponse);
        return true;
        
      case 'LOG_FILL_EVENT':
        this.logFillEvent(message.data);
        break;
    }
  }

  async markCodeAsUsed(code) {
    try {
      const result = await browser.storage.local.get(['promoCodes']);
      const promoCodes = result.promoCodes || [];
      
      const promoCode = promoCodes.find(p => p.code === code);
      if (promoCode && !promoCode.used) {
        promoCode.used = true;
        promoCode.dateUsed = new Date().toISOString();
        
        await browser.storage.local.set({ promoCodes });
        return { success: true };
      }
      
      return { success: false, error: 'Code not found or already used' };
    } catch (error) {
      console.error('Error marking code as used:', error);
      return { success: false, error: error.message };
    }
  }

  async getSettings() {
    try {
      const result = await browser.storage.local.get(['promoCodes', 'giftCards', 'isEnabled']);
      return {
        promoCodes: result.promoCodes || [],
        giftCards: result.giftCards || [],
        isEnabled: result.isEnabled !== false
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return { promoCodes: [], giftCards: [], isEnabled: true };
    }
  }

  async saveSettings(data) {
    try {
      await browser.storage.local.set(data);
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  }

  logFillEvent(data) {
    // Log auto-fill events for debugging
    console.log('Auto-fill event:', data);
  }
}

// Initialize background manager
new BackgroundManager();
