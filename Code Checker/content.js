// Content script that runs on all pages
(function () {
    'use strict';

    // Common selectors for promo code fields
    const PROMO_SELECTORS = [
        // Bath & Body Works specific selectors (PRIORITY)
        '#promo-code-input',
        'input[name="code"]',
        'input[data-dan-component="promo-field--input"]',
        'input.chakra-input[name="code"]',

        // High-confidence generic selectors
        'input[name*="promo"]',
        'input[name*="coupon"]',
        'input[id*="promo"]',
        'input[id*="coupon"]',
        'input[placeholder*="promo" i]',
        'input[placeholder*="coupon" i]',
        'input[placeholder*="code" i]',
        'input[class*="promo"]',
        'input[class*="coupon"]',

        // Major retailer patterns
        'input[data-testid*="promo"]',
        'input[name*="promotionalCode"]',
        '.promo-code-input',
        '.promotional-code-input'
    ];

    // Common selectors for apply buttons
    const APPLY_BUTTON_SELECTORS = [
        // Bath & Body Works specific (PRIORITY)
        'button[data-dan-component="promo-field--btn"]',
        'button[name="promo-code-submit-btn"]',
        'button.chakra-button[type="submit"]',

        // High-confidence generic selectors
        'input[type="submit"][value*="apply" i]',
        'button[class*="apply"]',
        'button[id*="apply"]',
        'button[data-testid*="apply"]',
        '#promo-apply-btn',
        '#apply-promo-code',
        '.promo-apply-button',
        '.apply-promo-button',

        // Fallback selectors
        'button[type="submit"]',
        'input[type="submit"]'
    ];

    let isTestingCodes = false;

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'testCodes') {
            testPromoCodes()
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep message channel open for async response
        } else if (request.action === 'debugPage') {
            const debug = debugPageElements();
            sendResponse(debug);
            return true;
        }
    });

    // Auto-apply codes when checkout pages are detected
    function initAutoApply() {
        chrome.storage.local.get(['autoApply'], function (result) {
            if (result.autoApply !== false && isCheckoutPage()) {
                setTimeout(() => {
                    if (!isTestingCodes) {
                        testPromoCodes();
                    }
                }, 2000); // Wait for page to fully load
            }
        });
    }

    // Detect if current page is likely a checkout page
    function isCheckoutPage() {
        const url = window.location.href.toLowerCase();
        const checkoutKeywords = ['cart'];

        const hasCheckoutUrl = checkoutKeywords.some(keyword => url.includes(keyword));
        const hasPromoField = findPromoCodeField() !== null;

        return hasCheckoutUrl || hasPromoField;
    }

    // Find promo code input field
    function findPromoCodeField() {
        for (const selector of PROMO_SELECTORS) {
            const field = document.querySelector(selector);
            if (field && isVisible(field)) {
                return field;
            }
        }
        return null;
    }

    // Find apply button near the promo field
    function findApplyButton(promoField) {
        if (!promoField) return null;

        // Look for form submit button first
        const form = promoField.closest('form');
        if (form) {
            const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
            if (submitBtn && isVisible(submitBtn)) {
                return submitBtn;
            }
        }

        // Look for apply button in the same container
        const container = promoField.closest('div, section, fieldset, form');
        if (container) {
            // Try specific selectors first
            for (const selector of APPLY_BUTTON_SELECTORS.slice(0, -4)) { // Exclude generic ones
                const btn = container.querySelector(selector);
                if (btn && isVisible(btn)) {
                    return btn;
                }
            }
        }

        // Look for buttons with apply-related text nearby
        const nearbyButtons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]'))
            .filter(btn => isVisible(btn));

        for (const btn of nearbyButtons) {
            const btnText = (btn.textContent || btn.value || btn.getAttribute('aria-label') || '').toLowerCase();
            const isApplyButton = ['apply', 'redeem', 'use', 'submit', 'add'].some(word =>
                btnText.includes(word)
            );

            if (isApplyButton) {
                const distance = getElementDistance(promoField, btn);
                if (distance < 300) { // Increased distance for more flexibility
                    return btn;
                }
            }
        }

        // Fallback: look for the closest button to the promo field
        let closestButton = null;
        let closestDistance = Infinity;

        for (const btn of nearbyButtons) {
            const distance = getElementDistance(promoField, btn);
            if (distance < closestDistance && distance < 200) {
                closestDistance = distance;
                closestButton = btn;
            }
        }

        return closestButton;
    }

    // Check if element is visible
    function isVisible(element) {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            element.offsetWidth > 0 &&
            element.offsetHeight > 0;
    }

    // Get distance between two elements
    function getElementDistance(el1, el2) {
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();

        const centerX1 = rect1.left + rect1.width / 2;
        const centerY1 = rect1.top + rect1.height / 2;
        const centerX2 = rect2.left + rect2.width / 2;
        const centerY2 = rect2.top + rect2.height / 2;

        return Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
    }

    // Test all promo codes
    async function testPromoCodes() {
        if (isTestingCodes) {
            return { success: false, message: 'Already testing codes' };
        }
        
        isTestingCodes = true;

        const promoField = findPromoCodeField();
        if (!promoField) {
            isTestingCodes = false;
            return { success: false, message: 'No promo code field found' };
        }

        const applyButton = findApplyButton(promoField);
        if (!applyButton) {
            isTestingCodes = false;
            return { success: false, message: 'No apply button found' };
        }

        const result = await new Promise((resolve) => {
            chrome.storage.local.get(['promoCodes'], async function (data) {
                const codes = (data.promoCodes || []).filter(c => !c.used);

                if (codes.length === 0) {
                    resolve({ success: false, message: 'No unused codes available' });
                    return;
                }

                let successfulCode = null;
                let attempts = 0;
                let failedCodes = [];
                const maxAttempts = Math.min(codes.length, 10);

                for (const codeObj of codes.slice(0, maxAttempts)) {
                    attempts++;
                    console.log(`Trying code ${attempts}/${maxAttempts}: ${codeObj.code}`);

                    // Clear field and enter code
                    promoField.value = '';
                    promoField.focus();

                    // Trigger events to potentially enable the button
                    promoField.dispatchEvent(new Event('focus', { bubbles: true }));
                    promoField.dispatchEvent(new Event('input', { bubbles: true }));

                    // Enter the code
                    promoField.value = codeObj.code;

                    // Trigger more events
                    promoField.dispatchEvent(new Event('input', { bubbles: true }));
                    promoField.dispatchEvent(new Event('change', { bubbles: true }));
                    promoField.dispatchEvent(new Event('keyup', { bubbles: true }));
                    promoField.dispatchEvent(new Event('blur', { bubbles: true }));

                    // Wait a moment for the button to potentially become enabled
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Check if button is enabled now, try to enable it if not
                    if (applyButton.disabled) {
                        applyButton.disabled = false;
                    }

                    // Click apply button
                    applyButton.click();

                    // Wait for response and monitor for changes
                    const result = await waitForCodeResult();
                    
                    if (result.success) {
                        console.log(`SUCCESS: Code ${codeObj.code} worked! Stopping all code testing immediately.`);
                        successfulCode = codeObj;
                        await markCodeAsUsed(codeObj.code);
                        
                        // Send success message to background script
                        chrome.runtime.sendMessage({
                            action: 'codeApplied',
                            code: codeObj.code
                        });
                        
                        // Force exit the loop and prevent further testing
                        isTestingCodes = false;
                        resolve({
                            success: true,
                            message: `Success! Applied code: ${codeObj.code}`,
                            attempts: attempts,
                            failedCodes: failedCodes
                        });
                        return;
                    } else if (result.rejected) {
                        console.log(`Code ${codeObj.code} was rejected/already used, marking as used and trying next code`);
                        await markCodeAsUsed(codeObj.code);
                        failedCodes.push(codeObj.code);
                    } else {
                        console.log(`Code ${codeObj.code} - unclear result, keeping for retry`);
                        failedCodes.push(codeObj.code);
                    }

                    // Clear the field before trying next code
                    promoField.value = '';
                    promoField.dispatchEvent(new Event('input', { bubbles: true }));

                    // Wait before next attempt
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                let message = '';
                if (successfulCode) {
                    message = `Success! Applied code: ${successfulCode.code}`;
                } else {
                    message = `Tried ${attempts} codes, none worked`;
                    if (failedCodes.length > 0) {
                        message += ` (${failedCodes.length} codes marked as invalid)`;
                    }
                }

                resolve({
                    success: !!successfulCode,
                    message: message,
                    attempts: attempts,
                    failedCodes: failedCodes
                });
            });
        });

        isTestingCodes = false;
        return result;
    }

    // Check if code was successfully applied
    async function checkCodeSuccess() {
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Look for success messages
        const successSelectors = [
            '.success', '.alert-success', '.notification-success',
            '[class*="success"]', '[class*="applied"]', '[class*="valid"]',
            '[data-testid*="success"]', '[data-testid*="applied"]'
        ];

        for (const selector of successSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                if (isVisible(el)) {
                    const text = el.textContent.toLowerCase();
                    if (text.includes('success') || text.includes('applied') ||
                        text.includes('valid') || text.includes('accepted') ||
                        text.includes('discount') || text.includes('saved')) {
                        return true;
                    }
                }
            }
        }

        // Check for price reduction or discount amount
        const priceElements = document.querySelectorAll('[class*="total"], [class*="price"], [class*="discount"], [class*="savings"]');
        for (const el of priceElements) {
            if (isVisible(el)) {
                const text = el.textContent.toLowerCase();
                if (text.includes('-') || text.includes('$') || text.includes('save') || text.includes('discount')) {
                    return true;
                }
            }
        }

        // Bath & Body Works specific success indicators
        const bbwSuccess = document.querySelector('[data-dan-component*="success"], [data-dan-component*="applied"]');
        if (bbwSuccess && isVisible(bbwSuccess)) {
            return true;
        }

        return false;
    }

    // Wait for code result using DOM mutation observer
    async function waitForCodeResult() {
        return new Promise((resolve) => {
            let resolved = false;
            const timeout = 5000; // 5 second timeout
            
            // Set up mutation observer to watch for DOM changes
            const observer = new MutationObserver((mutations) => {
                if (resolved) return;
                
                // Check for success first
                const success = checkCodeSuccessSync();
                if (success) {
                    resolved = true;
                    observer.disconnect();
                    resolve({ success: true, rejected: false });
                    return;
                }
                
                // Check for rejection
                const rejected = checkCodeRejectedSync();
                if (rejected) {
                    resolved = true;
                    observer.disconnect();
                    resolve({ success: false, rejected: true });
                    return;
                }
            });
            
            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
            
            // Fallback timeout
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    observer.disconnect();
                    resolve({ success: false, rejected: false });
                }
            }, timeout);
        });
    }

    // Synchronous version of success check
    function checkCodeSuccessSync() {
        // Check all page text for success indicators
        const allText = document.body.textContent.toLowerCase();
        const successKeywords = [
            'free shipping on any purchase has been applied',
            '$10 off your purchase has been applied',
            'has been applied',
            'discount applied',
            'code applied', 
            'promo applied', 
            'coupon applied',
            'success', 
            'applied', 
            'savings', 
            'you saved'
        ];

        for (const keyword of successKeywords) {
            if (allText.includes(keyword)) {
                console.log(`Found success keyword: ${keyword}`);
                return true;
            }
        }

        // Look for success messages in specific elements
        const successSelectors = [
            '.success', '.alert-success', '.notification-success',
            '[class*="success"]', '[class*="applied"]', '[class*="valid"]',
            '[data-testid*="success"]', '[data-testid*="applied"]',
            '.message', '.alert', '.notification', '[role="alert"]'
        ];

        for (const selector of successSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                if (isVisible(el)) {
                    const text = el.textContent.toLowerCase();
                    if (successKeywords.some(keyword => text.includes(keyword))) {
                        console.log(`Found success in element: ${text.substring(0, 100)}`);
                        return true;
                    }
                }
            }
        }

        // Check for price changes (discount amounts)
        const priceElements = document.querySelectorAll('[class*="total"], [class*="price"], [class*="discount"], [class*="savings"]');
        for (const el of priceElements) {
            if (isVisible(el)) {
                const text = el.textContent.toLowerCase();
                if (text.includes('-$') || text.includes('save $') || text.includes('discount: $')) {
                    console.log(`Found price discount: ${text.substring(0, 50)}`);
                    return true;
                }
            }
        }

        return false;
    }

    // Synchronous version of rejection check
    function checkCodeRejectedSync() {
        // Check all visible text for error keywords
        const allText = document.body.textContent.toLowerCase();
        const errorKeywords = [
            'invalid', 'expired', 'not found', 'incorrect', 'not valid', 
            'unable', 'failed', 'already been used', 'already used',
            'one-time use', 'previously used', 'no longer valid', 
            'cannot be used again', 'has been used', 'not applicable'
        ];

        for (const keyword of errorKeywords) {
            if (allText.includes(keyword)) {
                return true;
            }
        }

        // Check specific error elements
        const errorSelectors = [
            '.error', '.alert-error', '.notification-error', '.alert-danger',
            '[class*="error"]', '[class*="invalid"]', '[class*="expired"]',
            '[data-testid*="error"]', '[data-testid*="invalid"]',
            '.message', '.alert', '.notification', '[role="alert"]'
        ];

        for (const selector of errorSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                if (isVisible(el) && el.textContent.trim().length > 0) {
                    const text = el.textContent.toLowerCase();
                    if (errorKeywords.some(keyword => text.includes(keyword))) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Check if code was rejected
    async function checkCodeRejected() {
        // Wait longer for error messages to appear
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Check all text on the page for error messages
        const allText = document.body.textContent.toLowerCase();
        const errorKeywords = [
            'invalid', 'expired', 'not found', 'incorrect', 'not valid', 
            'unable', 'failed', 'error', 'already been used', 'already used',
            'one-time use', 'previously used', 'no longer valid', 
            'cannot be used again', 'has been used', 'not applicable'
        ];

        for (const keyword of errorKeywords) {
            if (allText.includes(keyword)) {
                console.log(`Found error keyword: ${keyword}`);
                return true;
            }
        }

        // Also check specific error elements
        const errorSelectors = [
            '.error', '.alert-error', '.notification-error', '.alert-danger',
            '[class*="error"]', '[class*="invalid"]', '[class*="expired"]',
            '[data-testid*="error"]', '[data-testid*="invalid"]',
            '.message', '.alert', '.notification', '[role="alert"]'
        ];

        for (const selector of errorSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                if (isVisible(el)) {
                    const text = el.textContent.toLowerCase();
                    if (text.length > 0 && errorKeywords.some(keyword => text.includes(keyword))) {
                        console.log(`Found error in element: ${text.substring(0, 100)}`);
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Mark code as used
    function markCodeAsUsed(codeToMark) {
        return new Promise((resolve) => {
            chrome.storage.local.get(['promoCodes'], function (result) {
                const codes = result.promoCodes || [];
                const updatedCodes = codes.map(c =>
                    c.code === codeToMark ? { ...c, used: true, dateUsed: new Date().toISOString() } : c
                );
                chrome.storage.local.set({ promoCodes: updatedCodes }, resolve);
            });
        });
    }

    // Debug function to help identify page elements
    function debugPageElements() {
        const promoField = findPromoCodeField();
        const applyButton = findApplyButton(promoField);

        const allInputs = Array.from(document.querySelectorAll('input'))
            .filter(input => isVisible(input))
            .map(input => ({
                tag: input.tagName,
                type: input.type,
                id: input.id,
                name: input.name,
                className: input.className,
                placeholder: input.placeholder,
                ariaLabel: input.getAttribute('aria-label')
            }));

        const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]'))
            .filter(btn => isVisible(btn))
            .map(btn => ({
                tag: btn.tagName,
                type: btn.type,
                id: btn.id,
                className: btn.className,
                text: btn.textContent?.substring(0, 50),
                ariaLabel: btn.getAttribute('aria-label')
            }));

        return {
            foundPromoField: !!promoField,
            foundApplyButton: !!applyButton,
            promoFieldInfo: promoField ? {
                id: promoField.id,
                name: promoField.name,
                className: promoField.className,
                placeholder: promoField.placeholder
            } : null,
            applyButtonInfo: applyButton ? {
                tag: applyButton.tagName,
                id: applyButton.id,
                className: applyButton.className,
                text: applyButton.textContent?.substring(0, 50)
            } : null,
            allInputs: allInputs.slice(0, 10),
            allButtons: allButtons.slice(0, 10),
            isCheckoutPage: isCheckoutPage(),
            url: window.location.href
        };
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAutoApply);
    } else {
        initAutoApply();
    }

})();
