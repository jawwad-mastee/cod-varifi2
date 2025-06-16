
# COD Verifier for WooCommerce

A comprehensive WordPress plugin that adds OTP and token payment verification for Cash on Delivery (COD) orders in WooCommerce.

## 🚀 Features

- **OTP Verification**: Phone number verification via SMS
- **Token Payment**: ₹1 payment verification to prevent fake orders
- **Test & Production Modes**: Easy testing before going live
- **Fast2SMS Integration**: SMS delivery for OTP
- **Razorpay Integration**: Secure payment processing
- **Mobile Responsive**: Works on all devices
- **Easy Configuration**: Simple admin settings

## 📁 File Structure

```
/cod-verifier
├── cod-verifier.php                ← Main plugin file
├── /includes
│   ├── settings-page.php          ← Admin settings
│   ├── otp-handler.php            ← Handles OTP AJAX logic
│   └── razorpay-handler.php       ← ₹1 UPI token logic
├── /assets
│   ├── script.js                  ← Frontend JavaScript
│   └── style.css                  ← Plugin styles
├── /templates
│   └── otp-box.php               ← Verification UI template
├── /languages
│   └── cod-verifier.pot          ← Translation file
└── readme.txt                    ← WordPress plugin readme
```

## 📦 Installation

### Step 1: Upload Plugin
1. Download/create the `cod-verifier` folder with all files
2. Zip the entire `cod-verifier` folder
3. Go to WordPress Admin → Plugins → Add New → Upload Plugin
4. Upload the zip file and activate the plugin

### Step 2: Configure Settings
1. Go to **WooCommerce → COD Verifier** in admin menu
2. **Enable Test Mode** (recommended for initial setup)
3. Choose verification options:
   - ✅ Enable OTP Verification
   - ✅ Enable Token Payment
4. Save settings

### Step 3: Test the Plugin
1. Go to your WooCommerce checkout page
2. Add any product to cart and proceed to checkout
3. Select **"Cash on Delivery"** as payment method
4. **Verification box should appear** below payment methods
5. Test OTP:
   - Enter a 10-digit phone number
   - Click "Send OTP"
   - **In test mode, OTP will be shown in alert popup**
   - Enter the OTP and verify
6. Test Token Payment:
   - Click "Pay ₹1 Token"
   - **In test mode, payment is simulated**
   - Check the confirmation checkbox
7. Place order - should complete successfully

## 🔧 Production Setup

### SMS Configuration (Fast2SMS)
1. Sign up at [Fast2SMS](https://www.fast2sms.com)
2. Get your API key from dashboard
3. Add API key in plugin settings
4. Test SMS delivery

### Payment Configuration (Razorpay)
1. Sign up at [Razorpay](https://razorpay.com)
2. Get your Key ID and Key Secret
3. Add keys in plugin settings
4. Test payment flow

### Switch to Production
1. Add all API keys in settings
2. **Disable Test Mode**
3. Save settings
4. Test complete flow with real SMS and payment

## 🧪 Testing Guide

### Test Mode Features
- **OTP Display**: OTP shown in JavaScript alert
- **SMS Simulation**: No real SMS sent
- **Payment Simulation**: No real money charged
- **All Functionality**: Complete verification flow

### Testing Steps
1. **Enable Test Mode** in settings
2. Go to checkout and select COD
3. **Verify UI appears** - verification box should show
4. **Test OTP Flow**:
   - Enter phone: `9876543210`
   - Click "Send OTP"
   - Check alert for OTP code
   - Enter OTP and verify
   - Should show "✓ Verified"
5. **Test Token Payment**:
   - Click "Pay ₹1 Token"
   - Should show "✓ Payment Complete"
   - Check confirmation checkbox
6. **Complete Order**:
   - Click "Place Order"
   - Order should complete successfully

### Troubleshooting

#### Verification Box Not Showing
- Check if Cash on Delivery is enabled in WooCommerce
- Ensure plugin is activated
- Check browser console for JavaScript errors
- Clear cache if using caching plugins

#### OTP Not Working
- Verify Fast2SMS API key in production
- Check phone number format (10 digits starting with 6-9)
- In test mode, check JavaScript alert for OTP

#### Token Payment Issues
- Verify Razorpay keys in production
- Check if payment gateway is properly configured
- In test mode, payment should be simulated

#### Order Not Completing
- Check if both verifications are completed
- Look for validation errors on checkout page
- Check WordPress error logs

## 🔒 Security Features

- **Nonce Verification**: All AJAX requests secured
- **Session Management**: Secure session handling
- **Input Sanitization**: All inputs properly sanitized
- **OTP Expiration**: OTP expires after 5 minutes
- **Rate Limiting**: Prevents spam requests

## 🎨 Customization

### Styling
Edit `assets/style.css` to customize appearance:
- Colors and themes
- Layout and spacing
- Mobile responsiveness
- Button styles

### Text/Language
Use WordPress translation functions to customize text:
- All strings are translatable
- Create `.po` files for different languages
- Modify text in template files

## 📞 Support

### Common Issues
1. **Plugin not working**: Check WooCommerce compatibility
2. **UI not showing**: Clear cache and check for conflicts
3. **API errors**: Verify API keys and test connectivity
4. **Session issues**: Check PHP session configuration

### Debug Mode
Enable WordPress debug mode in `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Check `/wp-content/debug.log` for errors.

## 📝 Changelog

### Version 1.0.0
- Initial release
- OTP verification via Fast2SMS
- Token payment via Razorpay
- Test and production modes
- Mobile responsive design
- WordPress security standards

## 📄 License

This plugin is licensed under GPL v2 or later.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

---

**Ready to sell fake-order-free COD products?** 🚀

Test the plugin thoroughly in Test Mode, then switch to Production Mode with your API keys for real customers!
