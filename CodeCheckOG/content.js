// Content script for detecting and auto-filling checkout forms
class CheckoutAutoFill {
  constructor() {
    this.promoCodes = [];
    this.giftCards = [];
    this.isEnabled = true;
    this.init();
  }

  async init() {
    // Load saved data from storage
    await this.loadSettings();
    
    // Start monitoring for checkout forms
    this.observePageChanges();
    
    // Check current page immediately
    this.scanForCheckoutForms();
  }

  async loadSettings() {
    try {
      const result = await browser.storage.local.get(['promoCodes', 'giftCards', 'isEnabled']);
      this.promoCodes = result.promoCodes || [];
      this.giftCards = result.giftCards || [];
      this.isEnabled = result.isEnabled !== false;
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  }

  observePageChanges() {
    // Watch for dynamic content changes (SPAs, AJAX updates)
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if new form elements were added
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'FORM' || node.querySelector('form') || 
                  node.querySelector('input[type="text"]') || 
                  node.querySelector('input[name*="promo"]') ||
                  node.querySelector('input[name*="gift"]')) {
                shouldScan = true;
              }
            }
          });
        }
      });
      
      if (shouldScan) {
        setTimeout(() => this.scanForCheckoutForms(), 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  scanForCheckoutForms() {
    if (!this.isEnabled) return;

    console.log('Checkout Auto-Fill: Scanning for forms...');

    // Common selectors for promo code fields
    const promoSelectors = [
      'input[name*="promo"]',
      'input[name*="coupon"]',
      'input[name*="discount"]',
      'input[id*="promo"]',
      'input[id*="coupon"]',
      'input[id*="discount"]',
      'input[placeholder*="promo" i]',
      'input[placeholder*="coupon" i]',
      'input[placeholder*="discount" i]'
    ];

    // Common selectors for gift card fields
    const giftCardSelectors = [
      'input[name*="gift"]',
      'input[name*="card"]',
      'input[id*="gift"]',
      'input[id*="giftcard"]',
      'input[placeholder*="gift" i]',
      'input[placeholder*="card" i]',
      // More comprehensive selectors
      'input[name*="giftCard"]',
      'input[name*="gift_card"]',
      'input[name*="redemption"]',
      'input[id*="giftCard"]',
      'input[id*="gift_card"]',
      'input[id*="redemption"]',
      'input[class*="gift"]',
      'input[class*="card"]'
    ];

    // Common selectors for PIN fields
    const pinSelectors = [
      'input[name*="pin"]',
      'input[name*="security"]',
      'input[name*="cvv"]',
      'input[id*="pin"]',
      'input[id*="security"]',
      'input[placeholder*="pin" i]',
      'input[placeholder*="security" i]'
    ];

    console.log('Checkout Auto-Fill: Available data:', {
      promoCodes: this.promoCodes.length,
      giftCards: this.giftCards.length
    });

    // Fill promo codes
    promoSelectors.forEach(selector => {
      const fields = document.querySelectorAll(selector);
      if (fields.length > 0) {
        console.log(`Found ${fields.length} promo fields with selector: ${selector}`);
      }
      fields.forEach(field => {
        if (this.shouldFillField(field) && this.promoCodes.length > 0) {
          console.log('Filling promo code field:', field);
          this.fillPromoCode(field);
        }
      });
    });

    // Fill gift cards
    giftCardSelectors.forEach(selector => {
      const fields = document.querySelectorAll(selector);
      if (fields.length > 0) {
        console.log(`Found ${fields.length} gift card fields with selector: ${selector}`);
      }
      fields.forEach(field => {
        if (this.shouldFillField(field) && this.giftCards.length > 0) {
          console.log('Filling gift card field:', field);
          this.fillGiftCard(field);
        }
      });
    });

    // Fill PINs
    pinSelectors.forEach(selector => {
      const fields = document.querySelectorAll(selector);
      if (fields.length > 0) {
        console.log(`Found ${fields.length} PIN fields with selector: ${selector}`);
      }
      fields.forEach(field => {
        if (this.shouldFillField(field) && this.giftCards.length > 0) {
          console.log('Filling PIN field:', field);
          this.fillGiftCardPin(field);
        }
      });
    });
  }

  shouldFillField(field) {
    // Don't fill if field already has a value
    if (field.value && field.value.trim() !== '') return false;
    
    // Don't fill if field is disabled or readonly
    if (field.disabled || field.readOnly) return false;
    
    // Don't fill if field is not visible
    if (field.offsetParent === null) return false;
    
    return true;
  }

  fillPromoCode(field) {
    if (this.promoCodes.length === 0) return;
    
    // Find the first unused promo code
    const unusedCode = this.promoCodes.find(p => !p.used);
    if (!unusedCode) return;
    
    this.fillField(field, unusedCode.code);
    
    // Mark as used and save
    this.markCodeAsUsed(unusedCode.code);
    
    // Try to find and click apply button
    this.findAndClickApplyButton(field, 'promo');
  }

  async markCodeAsUsed(code) {
    // Send message to popup to mark code as used
    try {
      await browser.runtime.sendMessage({
        type: 'MARK_CODE_USED',
        code: code
      });
    } catch (error) {
      console.log('Error marking code as used:', error);
    }
  }

  fillGiftCard(field) {
    if (this.giftCards.length === 0) return;
    
    // Use the selected gift card, or first one if none selected
    const selectedCard = this.giftCards.find(g => g.selected) || this.giftCards[0];
    console.log('Filling gift card:', selectedCard);
    this.fillField(field, selectedCard.number);
    
    // Try to find and click apply button
    this.findAndClickApplyButton(field, 'gift');
  }

  fillGiftCardPin(field) {
    if (this.giftCards.length === 0) return;
    
    // Use the PIN from the selected gift card, or first one if none selected
    const selectedCard = this.giftCards.find(g => g.selected) || this.giftCards[0];
    console.log('Filling gift card PIN:', selectedCard);
    if (selectedCard && selectedCard.pin) {
      this.fillField(field, selectedCard.pin);
    }
  }

  fillField(field, value) {
    console.log('Filling field with value:', value);
    
    // Set the value
    field.value = value;
    
    // Trigger events to ensure the form recognizes the change
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));
    field.dispatchEvent(new Event('keyup', { bubbles: true }));
    
    // Add visual feedback
    field.style.backgroundColor = '#e8f5e8';
    field.style.border = '2px solid #4CAF50';
    setTimeout(() => {
      field.style.backgroundColor = '';
      field.style.border = '';
    }, 3000);
    
    console.log('Field filled successfully');
  }

  findAndClickApplyButton(field, type) {
    // Look for apply buttons near the field
    const container = field.closest('form') || field.closest('div');
    if (!container) return;

    const buttonSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button',
      '[role="button"]'
    ];

    const applyKeywords = ['apply', 'add', 'use', 'submit', 'redeem'];
    
    buttonSelectors.forEach(selector => {
      const buttons = container.querySelectorAll(selector);
      buttons.forEach(button => {
        const text = (button.textContent || button.value || '').toLowerCase();
        if (applyKeywords.some(keyword => text.includes(keyword))) {
          // Don't auto-click, just highlight the button
          button.style.border = '2px solid #4CAF50';
          button.style.boxShadow = '0 0 5px #4CAF50';
          
          setTimeout(() => {
            button.style.border = '';
            button.style.boxShadow = '';
          }, 3000);
        }
      });
    });
  }
}

// Initialize the auto-fill system
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CheckoutAutoFill();
  });
} else {
  new CheckoutAutoFill();
}
