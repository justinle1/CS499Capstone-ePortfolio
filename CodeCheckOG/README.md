# Checkout Auto-Fill Firefox Extension

A Firefox browser extension that automatically fills in promo codes and gift card information during checkout processes on e-commerce websites.

## Features

- **Auto-detection**: Automatically detects promo code and gift card input fields on checkout pages
- **Smart filling**: Fills fields with your saved codes and highlights apply buttons
- **Secure storage**: Stores your codes locally in the browser (gift card numbers are masked for security)
- **Easy management**: Simple popup interface to add, view, and delete codes
- **Toggle control**: Enable/disable auto-fill functionality as needed
- **Universal compatibility**: Works on all websites with standard checkout forms

## Installation

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Navigate to the extension folder and select `manifest.json`
5. The extension will be loaded and active

## Usage

### Adding Codes
1. Click the extension icon in the Firefox toolbar
2. Enter promo codes in the "Promo Codes" section
3. Enter gift card numbers in the "Gift Cards" section
4. Click "Add" to save each code

### Auto-Fill Behavior
- The extension automatically scans checkout pages for relevant input fields
- When detected, it fills the first available promo code or gift card
- Fields turn light green when auto-filled
- Apply buttons are highlighted with a green border for 3 seconds
- You still need to manually click the apply button for security

### Managing Codes
- View all saved codes in the popup
- Delete codes by clicking the "×" button
- Toggle the extension on/off using the switch at the top
- Gift card numbers are masked (showing only last 4 digits) for security

## Supported Field Types

The extension recognizes common field patterns including:
- Promo code fields: `promo`, `coupon`, `discount`
- Gift card fields: `gift`, `card`, `giftcard`
- Various naming conventions and placeholder text

## Security Notes

- All data is stored locally in your browser
- Gift card numbers are masked in the interface
- The extension only fills visible, empty fields
- No data is transmitted to external servers
- You maintain full control over when codes are applied

## Development

The extension consists of:
- `manifest.json`: Extension configuration
- `content.js`: Main auto-fill logic that runs on web pages
- `popup.html/js`: User interface for managing codes
- `background.js`: Background processes and storage management

## Troubleshooting

- If auto-fill isn't working, check that the extension is enabled in the popup
- Some websites use non-standard field names - the extension may not detect them
- Dynamic content (AJAX) is supported through mutation observers
- Check the browser console for any error messages

## Privacy

This extension:
- Does not collect or transmit any personal data
- Stores all information locally in your browser
- Does not make external network requests
- Only accesses the current tab when auto-filling
