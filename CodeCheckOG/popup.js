// Popup script for managing promo codes and gift cards
class PopupManager {
  constructor() {
    this.promoCodes = [];
    this.giftCards = [];
    this.isEnabled = true;
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.render();
  }

  async loadData() {
    try {
      const result = await browser.storage.local.get(['promoCodes', 'giftCards', 'isEnabled']);
      this.promoCodes = result.promoCodes || [];
      this.giftCards = result.giftCards || [];
      this.isEnabled = result.isEnabled !== false;
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async saveData() {
    try {
      await browser.storage.local.set({
        promoCodes: this.promoCodes,
        giftCards: this.giftCards,
        isEnabled: this.isEnabled
      });
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  setupEventListeners() {
    // Toggle switch
    const enableToggle = document.getElementById('enableToggle');
    enableToggle.checked = this.isEnabled;
    enableToggle.addEventListener('change', (e) => {
      this.isEnabled = e.target.checked;
      this.saveData();
    });

    // Add promo code
    const addPromoBtn = document.getElementById('addPromo');
    const promoInput = document.getElementById('promoInput');
    
    addPromoBtn.addEventListener('click', () => {
      this.addPromoCode();
    });
    
    promoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addPromoCode();
      }
    });

    // Bulk import functionality
    const bulkImportBtn = document.getElementById('bulkImport');
    const bulkInput = document.getElementById('bulkInput');
    const bulkControls = document.querySelector('.bulk-controls');
    const confirmBulkBtn = document.getElementById('confirmBulk');
    const cancelBulkBtn = document.getElementById('cancelBulk');
    const exportBtn = document.getElementById('exportCodes');
    const clearUsedBtn = document.getElementById('clearUsed');

    bulkImportBtn.addEventListener('click', () => {
      bulkInput.style.display = 'block';
      bulkControls.style.display = 'flex';
      bulkInput.focus();
    });

    cancelBulkBtn.addEventListener('click', () => {
      bulkInput.style.display = 'none';
      bulkControls.style.display = 'none';
      bulkInput.value = '';
    });

    confirmBulkBtn.addEventListener('click', () => {
      this.bulkImportCodes();
    });

    exportBtn.addEventListener('click', () => {
      this.exportCodes();
    });

    clearUsedBtn.addEventListener('click', () => {
      this.clearUsedCodes();
    });

    // Add gift card
    const addGiftBtn = document.getElementById('addGift');
    const giftInput = document.getElementById('giftInput');
    const pinInput = document.getElementById('pinInput');
    
    addGiftBtn.addEventListener('click', () => {
      this.addGiftCard();
    });
    
    giftInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addGiftCard();
      }
    });
    
    pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addGiftCard();
      }
    });
  }

  addPromoCode() {
    const input = document.getElementById('promoInput');
    const code = input.value.trim();
    
    if (code && !this.promoCodes.some(p => p.code === code)) {
      this.promoCodes.push({
        id: Date.now(),
        code: code,
        used: false,
        dateAdded: new Date().toISOString(),
        dateUsed: null
      });
      
      input.value = '';
      this.saveData();
      this.render();
    }
  }

  bulkImportCodes() {
    const bulkInput = document.getElementById('bulkInput');
    const codes = bulkInput.value.split('\n')
      .map(code => code.trim())
      .filter(code => code && !this.promoCodes.some(p => p.code === code));
    
    const newCodes = codes.map(code => ({
      id: Date.now() + Math.random(),
      code: code,
      used: false,
      dateAdded: new Date().toISOString(),
      dateUsed: null
    }));
    
    this.promoCodes.push(...newCodes);
    
    // Hide bulk import UI
    bulkInput.style.display = 'none';
    document.querySelector('.bulk-controls').style.display = 'none';
    bulkInput.value = '';
    
    this.saveData();
    this.render();
    
    alert(`Imported ${newCodes.length} promo codes!`);
  }

  exportCodes() {
    const unused = this.promoCodes.filter(p => !p.used).map(p => p.code);
    const used = this.promoCodes.filter(p => p.used).map(p => p.code);
    
    const exportData = {
      unused: unused,
      used: used,
      exportDate: new Date().toISOString(),
      totalCodes: this.promoCodes.length
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promo-codes-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clearUsedCodes() {
    const usedCount = this.promoCodes.filter(p => p.used).length;
    if (usedCount === 0) {
      alert('No used codes to clear!');
      return;
    }
    
    if (confirm(`Remove ${usedCount} used promo codes?`)) {
      this.promoCodes = this.promoCodes.filter(p => !p.used);
      this.saveData();
      this.render();
    }
  }

  markCodeAsUsed(code) {
    const promoCode = this.promoCodes.find(p => p.code === code);
    if (promoCode && !promoCode.used) {
      promoCode.used = true;
      promoCode.dateUsed = new Date().toISOString();
      this.saveData();
      return true;
    }
    return false;
  }

  togglePromoCodeUsed(id) {
    const promoCode = this.promoCodes.find(p => p.id === id);
    if (promoCode) {
      promoCode.used = !promoCode.used;
      if (promoCode.used) {
        promoCode.dateUsed = new Date().toISOString();
      } else {
        promoCode.dateUsed = null;
      }
      this.saveData();
      this.render();
    }
  }

  addGiftCard() {
    const numberInput = document.getElementById('giftInput');
    const pinInput = document.getElementById('pinInput');
    const number = numberInput.value.trim();
    const pin = pinInput.value.trim();
    
    if (number && !this.giftCards.some(g => g.number === number)) {
      this.giftCards.push({
        id: Date.now(),
        number: number,
        pin: pin || null,
        selected: this.giftCards.length === 0, // Auto-select first card
        dateAdded: new Date().toISOString()
      });
      
      numberInput.value = '';
      pinInput.value = '';
      this.saveData();
      this.renderGiftCards();
    }
  }

  selectGiftCard(id) {
    // Deselect all cards first
    this.giftCards.forEach(card => card.selected = false);
    
    // Select the chosen card
    const selectedCard = this.giftCards.find(card => card.id === id);
    if (selectedCard) {
      selectedCard.selected = true;
      this.saveData();
      this.renderGiftCards();
    }
  }

  deletePromoCode(id) {
    this.promoCodes = this.promoCodes.filter(p => p.id !== id);
    this.saveData();
    this.renderPromoCodes();
  }

  deleteGiftCard(id) {
    this.giftCards = this.giftCards.filter(g => g.id !== id);
    this.saveData();
    this.renderGiftCards();
  }

  render() {
    this.renderPromoCodes();
    this.renderGiftCards();
  }

  renderPromoCodes() {
    const container = document.getElementById('promoList');
    const countBadge = document.getElementById('promoCount');
    
    const unusedCount = this.promoCodes.filter(p => !p.used).length;
    const totalCount = this.promoCodes.length;
    countBadge.textContent = `${unusedCount}/${totalCount}`;
    
    if (this.promoCodes.length === 0) {
      container.innerHTML = '<div class="empty-state">No promo codes added yet</div>';
      return;
    }
    
    // Sort: unused first, then used
    const sortedCodes = [...this.promoCodes].sort((a, b) => {
      if (a.used === b.used) return 0;
      return a.used ? 1 : -1;
    });
    
    // Clear container and rebuild
    container.innerHTML = '';
    
    sortedCodes.forEach(promo => {
      const item = document.createElement('div');
      item.className = `code-item ${promo.used ? 'used' : ''}`;
      
      const codeText = document.createElement('span');
      codeText.className = 'code-text';
      codeText.textContent = promo.code;
      
      const status = document.createElement('span');
      status.className = `status ${promo.used ? 'used' : ''}`;
      status.textContent = promo.used ? 'USED' : 'READY';
      
      const toggleBtn = document.createElement('button');
      toggleBtn.className = `toggle-used-btn ${promo.used ? 'used' : ''}`;
      toggleBtn.textContent = promo.used ? '↻' : '✓';
      toggleBtn.addEventListener('click', () => this.togglePromoCodeUsed(promo.id));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => this.deletePromoCode(promo.id));
      
      item.appendChild(codeText);
      item.appendChild(status);
      item.appendChild(toggleBtn);
      item.appendChild(deleteBtn);
      
      container.appendChild(item);
    });
  }

  renderGiftCards() {
    const container = document.getElementById('giftList');
    
    if (this.giftCards.length === 0) {
      container.innerHTML = '<div class="empty-state">No gift cards added yet</div>';
      return;
    }
    
    // Clear container and rebuild
    container.innerHTML = '';
    
    this.giftCards.forEach(gift => {
      const item = document.createElement('div');
      item.className = `code-item gift-item ${gift.selected ? 'selected' : ''}`;
      
      const cardText = document.createElement('span');
      cardText.className = 'code-text';
      cardText.textContent = `${this.maskGiftCard(gift.number)}${gift.pin ? ' (PIN: ****)' : ''}`;
      
      const selectBtn = document.createElement('button');
      selectBtn.className = `select-btn ${gift.selected ? 'selected' : ''}`;
      selectBtn.textContent = gift.selected ? '★' : '☆';
      selectBtn.addEventListener('click', () => this.selectGiftCard(gift.id));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => this.deleteGiftCard(gift.id));
      
      item.appendChild(cardText);
      item.appendChild(selectBtn);
      item.appendChild(deleteBtn);
      
      container.appendChild(item);
    });
  }

  maskGiftCard(number) {
    // Mask all but last 4 digits for security
    if (number.length <= 4) return number;
    return '*'.repeat(number.length - 4) + number.slice(-4);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup manager
const popupManager = new PopupManager();
