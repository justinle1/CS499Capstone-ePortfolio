document.addEventListener('DOMContentLoaded', function () {
    const elements = {
        singleCode: document.getElementById('singleCode'),
        addSingleCode: document.getElementById('addSingleCode'),
        bulkCodes: document.getElementById('bulkCodes'),
        addBulkCodes: document.getElementById('addBulkCodes'),
        autoApply: document.getElementById('autoApply'),
        testCodes: document.getElementById('testCodes'),
        debugPage: document.getElementById('debugPage'),
        clearAllCodes: document.getElementById('clearAllCodes'),
        codesList: document.getElementById('codesList'),
        codeCount: document.getElementById('codeCount'),
        status: document.getElementById('status')
    };

    // Load existing codes and settings
    loadCodes();
    loadSettings();

    // Event listeners
    elements.addSingleCode.addEventListener('click', addSingleCode);
    elements.addBulkCodes.addEventListener('click', addBulkCodes);
    elements.autoApply.addEventListener('change', toggleAutoApply);
    elements.testCodes.addEventListener('click', testCodesOnPage);
    elements.debugPage.addEventListener('click', debugPageElements);
    elements.clearAllCodes.addEventListener('click', clearAllCodes);

    // Allow Enter key to add single code
    elements.singleCode.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addSingleCode();
        }
    });

    function addSingleCode() {
        const code = elements.singleCode.value.trim();
        if (code) {
            addCodes([code]);
            elements.singleCode.value = '';
        }
    }

    function addBulkCodes() {
        const codes = elements.bulkCodes.value
            .split('\n')
            .map(code => code.trim())
            .filter(code => code.length > 0);

        if (codes.length > 0) {
            addCodes(codes);
            elements.bulkCodes.value = '';
        }
    }

    function addCodes(newCodes) {
        chrome.storage.local.get(['promoCodes'], function (result) {
            const existingCodes = result.promoCodes || [];
            const codeSet = new Set(existingCodes.map(c => c.code));

            const uniqueNewCodes = newCodes.filter(code => !codeSet.has(code));
            const duplicatesCount = newCodes.length - uniqueNewCodes.length;

            const updatedCodes = [
                ...existingCodes,
                ...uniqueNewCodes.map(code => ({
                    code: code,
                    used: false,
                    dateAdded: new Date().toISOString()
                }))
            ];

            chrome.storage.local.set({ promoCodes: updatedCodes }, function () {
                loadCodes();
                let message = `Added ${uniqueNewCodes.length} new code(s)`;
                if (duplicatesCount > 0) {
                    message += ` (${duplicatesCount} duplicate(s) skipped)`;
                }
                showStatus(message, 'success');
            });
        });
    }

    function loadCodes() {
        chrome.storage.local.get(['promoCodes'], function (result) {
            const codes = result.promoCodes || [];
            displayCodes(codes);
            elements.codeCount.textContent = codes.filter(c => !c.used).length;
        });
    }

    function displayCodes(codes) {
        if (codes.length === 0) {
            elements.codesList.innerHTML = '<p>No codes stored</p>';
            return;
        }

        const html = codes.map(codeObj => `
      <div class="code-item ${codeObj.used ? 'used' : ''}">
        <span>${codeObj.code}</span>
        <button onclick="removeCode('${codeObj.code}')" style="background: none; border: none; color: #999; cursor: pointer;">✕</button>
      </div>
    `).join('');

        elements.codesList.innerHTML = html;
    }

    // Make removeCode available globally for onclick
    window.removeCode = function (codeToRemove) {
        chrome.storage.local.get(['promoCodes'], function (result) {
            const codes = result.promoCodes || [];
            const updatedCodes = codes.filter(c => c.code !== codeToRemove);
            chrome.storage.local.set({ promoCodes: updatedCodes }, function () {
                loadCodes();
                showStatus('Code removed', 'success');
            });
        });
    };

    function clearAllCodes() {
        if (confirm('Are you sure you want to clear all codes?')) {
            chrome.storage.local.set({ promoCodes: [] }, function () {
                loadCodes();
                showStatus('All codes cleared', 'success');
            });
        }
    }

    function loadSettings() {
        chrome.storage.local.get(['autoApply'], function (result) {
            elements.autoApply.checked = result.autoApply !== false; // Default to true
        });
    }

    function toggleAutoApply() {
        const autoApply = elements.autoApply.checked;
        chrome.storage.local.set({ autoApply: autoApply });
    }

    function testCodesOnPage() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tabId = tabs[0].id;

            // First try to send message
            chrome.tabs.sendMessage(tabId, { action: 'testCodes' }, function (response) {
                if (chrome.runtime.lastError) {
                    // If content script isn't loaded, try to inject it
                    console.log('Content script not found, trying to inject...');

                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ['content.js']
                    }, function () {
                        if (chrome.runtime.lastError) {
                            showStatus('Could not inject script on this page', 'error');
                            return;
                        }

                        // Try again after injection
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tabId, { action: 'testCodes' }, function (response) {
                                if (chrome.runtime.lastError) {
                                    showStatus('Could not test codes on this page', 'error');
                                } else if (response && response.success) {
                                    showStatus(response.message, 'success');
                                    setTimeout(loadCodes, 1000);
                                } else {
                                    showStatus(response?.message || 'No promo code fields found on this page', 'error');
                                }
                            });
                        }, 1000);
                    });
                } else if (response && response.success) {
                    showStatus(response.message, 'success');
                    setTimeout(loadCodes, 1000);
                } else {
                    showStatus(response?.message || 'No promo code fields found on this page', 'error');
                }
            });
        });
    }

    function debugPageElements() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tabId = tabs[0].id;

            chrome.tabs.sendMessage(tabId, { action: 'debugPage' }, function (response) {
                if (chrome.runtime.lastError) {
                    // Try to inject content script first
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ['content.js']
                    }, function () {
                        if (chrome.runtime.lastError) {
                            showStatus('Could not debug this page', 'error');
                            return;
                        }

                        // Try debug again after injection
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tabId, { action: 'debugPage' }, function (response) {
                                if (chrome.runtime.lastError) {
                                    showStatus('Could not debug this page', 'error');
                                } else if (response) {
                                    handleDebugResponse(response);
                                }
                            });
                        }, 1000);
                    });
                } else if (response) {
                    handleDebugResponse(response);
                }
            });
        });
    }

    function handleDebugResponse(response) {
        console.log('Page Debug Info:', response);

        let message = `Debug Info:\n`;
        message += `URL: ${response.url}\n`;
        message += `Promo field found: ${response.foundPromoField ? 'YES' : 'NO'}\n`;
        message += `Apply button found: ${response.foundApplyButton ? 'YES' : 'NO'}\n`;
        message += `Is checkout page: ${response.isCheckoutPage ? 'YES' : 'NO'}\n`;

        if (response.promoFieldInfo) {
            message += `\nPromo field details:\n`;
            message += `- ID: "${response.promoFieldInfo.id}"\n`;
            message += `- Name: "${response.promoFieldInfo.name}"\n`;
            message += `- Class: "${response.promoFieldInfo.className}"\n`;
            message += `- Placeholder: "${response.promoFieldInfo.placeholder}"\n`;
        }
        if (response.applyButtonInfo) {
            message += `\nApply button details:\n`;
            message += `- Tag: ${response.applyButtonInfo.tag}\n`;
            message += `- ID: "${response.applyButtonInfo.id}"\n`;
            message += `- Class: "${response.applyButtonInfo.className}"\n`;
            message += `- Text: "${response.applyButtonInfo.text}"\n`;
        }

        alert(message);
        showStatus('Debug info logged to console', 'success');
    }

    function showStatus(message, type) {
        elements.status.textContent = message;
        elements.status.className = `status ${type}`;
        elements.status.style.display = 'block';

        setTimeout(() => {
            elements.status.style.display = 'none';
        }, 3000);
    }
});