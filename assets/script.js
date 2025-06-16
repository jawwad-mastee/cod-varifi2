jQuery(document).ready(function($) {
    'use strict';
    
    console.log('COD Verifier: Script initialized');
    
    // Check if codVerifier is defined
    if (typeof codVerifier === 'undefined') {
        console.error('COD Verifier: codVerifier object not found.');
        return;
    }
    
    // Global verification state
    window.codVerifierStatus = {
      otpVerified: false,
      tokenVerified: false
    };
    let isBlockCheckout = $('.wc-block-checkout').length > 0;
    let verificationBoxCreated = false;
    
    console.log('COD Verifier: Checkout type:', isBlockCheckout ? 'Blocks' : 'Classic');
    
    // ===== UTILITY FUNCTIONS =====
    
    // Function to get selected payment method (primarily for showing/hiding the box)
    function getSelectedPaymentMethod() {
        let selectedMethod = null;
    
        // Combined and prioritized selectors for both Block and Classic checkout
        const selectors = [
            'input#radio-control-wc-payment-method-options-cod:checked', // Specific Block Checkout selector you found
            'input[name="payment_method"]:checked', // Standard classic checkout selector
            '.wc-block-components-radio-control__input:checked', // Common block checkout radio input
            'input[name*="radio-control-wc-payment-method"]:checked', // Partial name match for block checkout
            'input[name*="payment-method"]:checked', // Broader partial name match
            'input.wc-payment-method-input:checked' // Common WooCommerce class
        ];
    
        for (let selector of selectors) {
            const $input = $(selector);
            if ($input.length > 0) {
                selectedMethod = $input.val();
                if (selectedMethod) { // Ensure we got a non-empty value string
                     break;
                }
            }
        }
    
        console.log('COD Verifier: Selected payment method (for box visibility):', selectedMethod);
        return selectedMethod;
    }
    
    function createVerificationBox() {
        if (verificationBoxCreated) {
            return $('#cod-verifier-wrapper-active');
        }
        
        const $template = $('#cod-verification-template #cod-verifier-wrapper');
        if ($template.length === 0) {
            console.error('COD Verifier: Template not found in DOM');
            return $();
        }
        
        const $clonedBox = $template.clone();
        $clonedBox.attr('id', 'cod-verifier-wrapper-active');
        
        // Find insertion point BEFORE the actions container
        let $insertionPoint = null;
        
        if (isBlockCheckout) {
            const blockSelectors = [
                '.wc-block-checkout__actions_row',
                '.wc-block-components-checkout-place-order-button',
                '.wp-block-woocommerce-checkout-order-summary-block'
            ];
            
            for (let selector of blockSelectors) {
                $insertionPoint = $(selector).first();
                if ($insertionPoint.length > 0) {
                    console.log('COD Verifier: Found insertion point:', selector);
                    break;
                }
            }
        } else {
            const classicSelectors = [
                '#order_review',
                '.woocommerce-checkout-review-order',
                '#place_order'
            ];
            
            for (let selector of classicSelectors) {
                $insertionPoint = $(selector).first();
                if ($insertionPoint.length > 0) {
                    console.log('COD Verifier: Found insertion point:', selector);
                    break;
                }
            }
        }
        
        if ($insertionPoint && $insertionPoint.length > 0) {
            $insertionPoint.before($clonedBox);
            verificationBoxCreated = true;
            console.log('COD Verifier: Verification box created');
            return $clonedBox;
        } else {
            console.error('COD Verifier: No suitable insertion point found');
            return $();
        }
    }
    
    function updateHiddenFields() {
        $('input[name="cod_otp_verified"]').remove();
        $('input[name="cod_token_verified"]').remove();
        
        const $checkoutForm = $('form.checkout, form.wc-block-checkout__form').first();
        if ($checkoutForm.length > 0) {
            $checkoutForm.append('<input type="hidden" name="cod_otp_verified" value="' + (window.codVerifierStatus.otpVerified ? '1' : '0') + '">');
            $checkoutForm.append('<input type="hidden" name="cod_token_verified" value="' + (window.codVerifierStatus.tokenVerified ? '1' : '0') + '">');
        }

        console.log('COD Verifier: Hidden fields updated - OTP:', window.codVerifierStatus.otpVerified, 'Token:', window.codVerifierStatus.tokenVerified);
    }
    
    function updateVerificationStatus() {
        if (codVerifier.enableOTP === '1') {
            const otpBadge = $('#cod-otp-badge');
            if (otpBadge.length) {
                if (window.codVerifierStatus.otpVerified) {
                    otpBadge.text('✓ Verified').removeClass('pending').addClass('verified');
                } else {
                    otpBadge.text('Pending').removeClass('verified').addClass('pending');
                }
            }
        }

        if (codVerifier.enableToken === '1') {
            const tokenBadge = $('#cod-token-badge');
            if (tokenBadge.length) {
                if (window.codVerifierStatus.tokenVerified) {
                    tokenBadge.text('✓ Completed').removeClass('pending').addClass('verified');
                } else {
                    tokenBadge.text('Pending').removeClass('verified').addClass('pending');
                }
            }
        }

        updateHiddenFields();
        updatePlaceOrderButtonState(); // Update button state after verification status changes
    }
    
    function showMessage(type, message, status) {
        const $messageElement = $('#cod_' + type + '_message');
        $messageElement.removeClass('success error').addClass(status).html(message).show();
    }

    // Function to manage the Place Order button's disabled/enabled state
    function updatePlaceOrderButtonState() {
        const $placeOrderButton = $('#place_order, .wc-block-components-checkout-place-order-button, button[type="submit"]');
        // Directly check if COD is the selected method using reliable selectors
        const isCODSelectedNow = $('input#radio-control-wc-payment-method-options-cod:checked, input[name="payment_method"][value="cod"]:checked, input[name="payment_method"]:checked[value="cash_on_delivery"], .wc-block-components-radio-control__input:checked[value="cod"], .wc-block-components-radio-control__input:checked[value="cash_on_delivery"], input[name*="radio-control-wc-payment-method"]:checked[value="cod"], input[name*="radio-control-wc-payment-method"]:checked[value="cash_on_delivery"], input[name*="payment-method"]:checked[value="cod"], input[name*="payment-method"]:checked[value="cash_on_delivery"], input.wc-payment-method-input:checked[value="cod"], input.wc-payment-method-input:checked[value="cash_on_delivery"]').length > 0;

        if (isCODSelectedNow) {
            console.log('COD Verifier: COD selected, checking verification status for button state.');
            let canPlaceOrder = true;

            // Check if OTP is enabled and not verified
            if (codVerifier.enableOTP === '1' && !window.codVerifierStatus.otpVerified) {
                canPlaceOrder = false;
            }

            // Check if Token is enabled and not verified/confirmed
            if (codVerifier.enableToken === '1' && (!window.codVerifierStatus.tokenVerified || !$('#cod_token_confirmed').is(':checked'))) {
                 canPlaceOrder = false;
            }

            if (canPlaceOrder) {
                $placeOrderButton.prop('disabled', false).removeClass('disabled');
                console.log('COD Verifier: Verification complete, enabling place order button.');
            } else {
                $placeOrderButton.prop('disabled', true).addClass('disabled');
                console.log('COD Verifier: Verification incomplete, disabling place order button.');
            }
        } else {
            // If not COD, ensure button is enabled
            $placeOrderButton.prop('disabled', false).removeClass('disabled');
            console.log('COD Verifier: Non-COD selected, enabling place order button.');
        }
    }
    
    // ===== PAYMENT METHOD HANDLING =====
    
    function handlePaymentMethodChange() {
        const selectedMethod = getSelectedPaymentMethod(); // Use getSelectedPaymentMethod here for box visibility
        
        if (selectedMethod === 'cod' || selectedMethod === 'cash_on_delivery') {
            console.log('COD Verifier: COD selected, showing verification box.');
            showVerificationBox();
        } else {
            console.log('COD Verifier: Non-COD selected, hiding verification box.');
            hideVerificationBox();
        }
        // Always update button state after any payment method change
        updatePlaceOrderButtonState();
    }
    
    function showVerificationBox() {
        let $wrapper = $('#cod-verifier-wrapper-active');
        
        if ($wrapper.length === 0) {
            $wrapper = createVerificationBox();
        }
        
        if ($wrapper.length > 0) {
            $wrapper.show();
            console.log('COD Verifier: Verification box shown');
            populatePhoneFromBilling();
            updateVerificationStatus(); // This will call updatePlaceOrderButtonState
        }
    }
    
    function hideVerificationBox() {
        const $wrapper = $('#cod-verifier-wrapper-active');
        if ($wrapper.length > 0) {
            $wrapper.hide();
            console.log('COD Verifier: Verification box hidden');
            resetVerificationStates(); // This will call updatePlaceOrderButtonState
        }
    }
    
    function populatePhoneFromBilling() {
        const phoneSelectors = ['#billing_phone', 'input[name*="billing-phone"]', 'input[name*="phone"]'];
        let billingPhone = '';
        
        for (let selector of phoneSelectors) {
            const $phone = $(selector);
            if ($phone.length > 0 && $phone.val()) {
                billingPhone = $phone.val();
                break;
            }
        }
        
        if (billingPhone && !$('#cod_phone').val()) {
            $('#cod_phone').val(billingPhone);
        }
    }
    
    function resetVerificationStates() {
        window.codVerifierStatus.otpVerified = false;
        window.codVerifierStatus.tokenVerified = false;
        $('#cod_otp').val('');
        $('#cod_phone').val('');
        $('#cod_token_confirmed').prop('checked', false);
        $('#cod_otp_message').removeClass('success error').hide();
        $('#cod_token_message').removeClass('success error').hide();
        $('#cod_verify_otp').prop('disabled', true).text('Verify').removeClass('verified');
        $('#cod_pay_token').text('Pay ₹1 Token').removeClass('verified');
        updateHiddenFields();
        updateVerificationStatus(); // This will call updatePlaceOrderButtonState
    }
    
// ===== EVENT LISTENERS FOR PAYMENT METHOD CHANGES =====

    // Listen for changes on the payment method inputs using a broad selector
    // This primarily triggers showing/hiding the verification box and updates button state.
    $(document).on('change', 'input[name="payment_method"], .wc-block-components-radio-control__input, input[name*="radio-control-wc-payment-method"], input[name*="payment-method"], input.wc-payment-method-input', handlePaymentMethodChange);

    // Listen for WooCommerce's updated_checkout event (triggered after various checkout updates like shipping changes)
    $(document.body).on('updated_checkout', function() {
        console.log('COD Verifier: updated_checkout triggered');
        // Add a slight delay to ensure DOM updates are complete before checking and updating button state
        setTimeout(updatePlaceOrderButtonState, 300); // Directly update button state
        setTimeout(handlePaymentMethodChange, 350); // Also update box visibility
    });

    // Listen for changes within the payment method sections specifically (more targeted)
    $(document).on('change', '#payment, #order_review, .wc-block-checkout', function() { // Added #payment which wraps payment methods in classic checkout
         console.log('COD Verifier: Payment method section change detected');
         // Add a small delay
         setTimeout(updatePlaceOrderButtonState, 200); // Directly update button state
         setTimeout(handlePaymentMethodChange, 250); // Also update box visibility
    });

    // Initial checks with increased and varied delays to improve reliability on page load
    // These initial checks ensure the box is correctly shown/hidden and button state is set on page load.
    setTimeout(updatePlaceOrderButtonState, 100); // Fastest initial button state check
    setTimeout(handlePaymentMethodChange, 150); // Fastest initial box visibility check
    setTimeout(updatePlaceOrderButtonState, 600); // After basic DOM ready
    setTimeout(handlePaymentMethodChange, 650);
    setTimeout(updatePlaceOrderButtonState, 1500); // After potential AJAX updates
    setTimeout(handlePaymentMethodChange, 1550);
    setTimeout(updatePlaceOrderButtonState, 3000); // A later check for complex scenarios
    setTimeout(handlePaymentMethodChange, 3050);
    setTimeout(updatePlaceOrderButtonState, 5000); // A final safety net check
    setTimeout(handlePaymentMethodChange, 5050);


    // ===== OTP VERIFICATION HANDLERS =====
    
    $(document).on('click', '#cod_send_otp', function(e) {
        e.preventDefault();
        
        const phone = $('#cod_phone').val().trim();
        const $btn = $(this);
        
        if (!phone) {
            showMessage('otp', 'Please enter your mobile number', 'error');
            return;
        }
        
        if (!/^[6-9]\d{9}$/.test(phone)) {
            showMessage('otp', 'Please enter a valid 10-digit mobile number starting with 6-9', 'error');
            return;
        }
        
        $btn.prop('disabled', true).text('Sending...');
        
        $.ajax({
            url: codVerifier.ajaxUrl,
            type: 'POST',
            data: {
                action: 'cod_send_otp',
                phone: phone,
                nonce: codVerifier.nonce
            },
            success: function(response) {
                if (response.success) {
                    showMessage('otp', response.data.message, 'success');
                    if (response.data.test_mode && response.data.otp) {
                        alert('TEST MODE - Your OTP is: ' + response.data.otp);
                    }
                    startOTPTimer($btn);
                    window.codVerifierStatus.otpVerified = true; // Update status on success
                    updateVerificationStatus(); // Update UI and button state
                } else {
                    showMessage('otp', response.data, 'error');
                }
            },
            error: function() {
                showMessage('otp', 'Failed to send OTP. Please try again.', 'error');
            },
            complete: function() {
                 $btn.prop('disabled', false).text('Send OTP');
                 // Timer will re-enable the button separately
            }
        });
    });
    
    function startOTPTimer($btn) {
        let timeLeft = 60;
        $btn.prop('disabled', true);
        const timer = setInterval(function() {
            $btn.text(`Resend in ${timeLeft}s`);
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(timer);
                $btn.prop('disabled', false).text('Send OTP');
            }
        }, 1000);
    }
    
    $(document).on('input', '#cod_otp', function() {
        const otp = $(this).val().trim();
        $('#cod_verify_otp').prop('disabled', otp.length !== 6);
    });
    
    $(document).on('click', '#cod_verify_otp', function(e) {
        e.preventDefault();
        
        const otp = $('#cod_otp').val().trim();
        const $btn = $(this);
        
        if (!otp || otp.length !== 6) {
            showMessage('otp', 'Please enter a valid 6-digit OTP', 'error');
            return;
        }
        
        $btn.prop('disabled', true).text('Verifying...');
        
        $.ajax({
            url: codVerifier.ajaxUrl,
            type: 'POST',
            data: {
                action: 'cod_verify_otp',
                otp: otp,
                nonce: codVerifier.nonce
            },
            success: function(response) {
                if (response.success) {
                    showMessage('otp', response.data, 'success');
                    window.codVerifierStatus.otpVerified = true;
                    $btn.text('✓ Verified').addClass('verified');
                    updateVerificationStatus(); // Update UI and button state
                } else {
                    showMessage('otp', response.data, 'error');
                    $btn.prop('disabled', false).text('Verify');
                }
            },
            error: function() {
                showMessage('otp', 'Failed to verify OTP. Please try again.', 'error');
            },
             complete: function() {
                // The button state is managed by updatePlaceOrderButtonState now
            }
        });
    });
    
    // ===== TOKEN PAYMENT HANDLERS =====
    
    $(document).on('click', '#cod_pay_token', function(e) {
        e.preventDefault();
        
        const $btn = $(this);
        $btn.prop('disabled', true).text('Processing...');
        
        $.ajax({
            url: codVerifier.ajaxUrl,
            type: 'POST',
            data: {
                action: 'cod_token_payment',
                nonce: codVerifier.nonce
            },
            success: function(response) {
                if (response.success) {
                    showMessage('token', response.data, 'success');
                    window.codVerifierStatus.tokenVerified = true;
                    $('#cod_token_confirmed').prop('checked', true); // Auto-check confirmation on success
                    $btn.text('✓ Payment Complete').addClass('verified');
                    updateVerificationStatus(); // Update UI and button state
                } else {
                    showMessage('token', response.data, 'error');
                    $('#cod_token_confirmed').prop('checked', false); // Uncheck on failure
                }
            },
            error: function() {
                showMessage('token', 'Payment failed. Please try again.', 'error');
                 $('#cod_token_confirmed').prop('checked', false); // Uncheck on failure
            },
            complete: function() {
                 $btn.prop('disabled', false).text('Pay ₹1 Token');
                 updatePlaceOrderButtonState(); // Ensure button state is updated after attempt
            }
        });
    });

    // Listen for changes on the token confirmed checkbox
     $(document).on('change', '#cod_token_confirmed', function() {
          console.log('COD Verifier: Token confirmed checkbox changed.');
          // This check is also part of updatePlaceOrderButtonState logic now.
          // We can directly call update button state here.
          updatePlaceOrderButtonState();
     });
    
    // ===== CRITICAL VALIDATION FUNCTION (Simplified) =====
    // This function acts as a final safety net by checking if the button is disabled.
    function preventOrderPlacement(e) {
        console.log('COD Verifier: preventOrderPlacement triggered (final button check). ');
        const $placeOrderButton = $('#place_order, .wc-block-components-checkout-place-order-button, button[type="submit"]');

        // If the button is disabled by our script, prevent the default action.
        // This catches attempts to bypass the disabled button (e.g., via JS or double click).
        if ($placeOrderButton.is(':disabled')) {
            console.log('COD Verifier: Order placement prevented by disabled button.');
            if (e && typeof e.preventDefault === 'function') {
                 e.preventDefault();
                 // Use stopImmediatePropagation to prevent other handlers of the same event
                 if (typeof e.stopImmediatePropagation === 'function') {
                      e.stopImmediatePropagation();
                 }
                 // Use stopPropagation as a fallback or additional measure
                 if (typeof e.stopPropagation === 'function') {
                      e.stopPropagation();
                 }
            }

            // Re-add WooCommerce notice if verification is incomplete
            const selectedMethod = getSelectedPaymentMethod(); // Use this only to potentially show notice
            if (selectedMethod === 'cod' || selectedMethod === 'cash_on_delivery') {
                 let errors = [];
                 if (codVerifier.enableOTP === '1' && !window.codVerifierStatus.otpVerified) {
                     errors.push('Please verify your phone number with OTP');
                 }
                 if (codVerifier.enableToken === '1' && (!window.codVerifierStatus.tokenVerified || !$('#cod_token_confirmed').is(':checked'))) {
                     errors.push('Please complete the ₹1 token payment and confirm');
                 }
                 if (errors.length > 0) {
                    // Clear previous notices before adding new ones
                    $('.woocommerce-error, .woocommerce-message, .woocommerce-info').remove();
                    $('.woocommerce-notices-wrapper').html('<div class="woocommerce-error" role="alert">' + errors.join('<br>• ') + '</div>');
                 }
            }

            return false; // Explicitly return false to indicate prevention
        }

        console.log('COD Verifier: PreventOrderPlacement check passed, allowing order.');
        return true; // Allow order placement if button was not disabled by our logic
    }
    
// ===== COMPREHENSIVE VALIDATION EVENT LISTENERS =====

    // Listen for click on Place Order button and similar elements
    // This listener triggers the final check in preventOrderPlacement.
    $(document).on('click', '#place_order, .wc-block-components-checkout-place-order-button, button[type="submit"]', function(e) {
        console.log('COD Verifier: Order placement attempted via click');
        // preventOrderPlacement will check the button's disabled state
        if (!preventOrderPlacement(e)) {
            // If preventOrderPlacement returns false, stop the event.
             e.preventDefault();
             e.stopImmediatePropagation();
             e.stopPropagation();
             return false;
        }
    });

    // Listen for form submission (another way order can be triggered)
    // This listener also triggers the final check in preventOrderPlacement.
    $(document).on('submit', 'form.checkout, form.wc-block-checkout__form, form[name="checkout"]', function(e) {
        console.log('COD Verifier: Form submission attempted');
        // preventOrderPlacement will check the button's disabled state
        if (!preventOrderPlacement(e)) {
            // If preventOrderPlacement returns false, stop the event.
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            return false;
        }
    });

    // Listen for WooCommerce specific checkout events
    // These events are also now handled by the button state check in preventOrderPlacement.
    $(document).on('checkout_place_order', function(e) {
        console.log('COD Verifier: WooCommerce checkout_place_order event');
        // Call preventOrderPlacement which checks button state
        if (!preventOrderPlacement(e)) {
             e.preventDefault();
             e.stopImmediatePropagation();
             return false; // Stop the event if preventOrderPlacement returned false
        }
        return true; // Allow the event to continue if preventOrderPlacement returned true
    });

    $(document).on('checkout_place_order_cod', function(e) {
        console.log('COD Verifier: WooCommerce checkout_place_order_cod event');
         // Call preventOrderPlacement which checks button state
        if (!preventOrderPlacement(e)) {
             e.preventDefault();
             e.stopImmediatePropagation();
             return false; // Stop the event if preventOrderPlacement returned false
        }
        return true; // Allow the event to continue if preventOrderPlacement returned true
    });

    // Ensure classic WooCommerce form validation also uses the simplified check
    $('form.checkout').on('checkout_place_order', function(e) {
        console.log('COD Verifier: Classic checkout form validation');
         // Call preventOrderPlacement which checks button state
        if (!preventOrderPlacement(e)) {
             e.preventDefault();
             e.stopImmediatePropagation();
             return false; // Stop the event if preventOrderPlacement returned false
        }
        return true; // Allow the event to continue if preventOrderPlacement returned true
    });


    // Additional safety net - continuous validation
    // This interval helps ensure the box visibility and button state are correct
    // in case dynamic updates happen without triggering specific events.
    setInterval(function() {
        // Check payment method periodically to update box visibility
        const selectedMethod = getSelectedPaymentMethod();
        if (selectedMethod === 'cod' || selectedMethod === 'cash_on_delivery') {
            updateHiddenFields();
            // updatePlaceOrderButtonState is called by updateVerificationStatus and handlePaymentMethodChange now
        } else {
             // If COD is not selected, still ensure the button is enabled periodically
             const $placeOrderButton = $('#place_order, .wc-block-components-checkout-place-order-button, button[type="submit"]');
             if ($placeOrderButton.is(':disabled')) {
                  // If button is disabled but COD is not selected, enable it.
                  // This handles cases where the state might get stuck.
                  $placeOrderButton.prop('disabled', false).removeClass('disabled');
                  console.log('COD Verifier: Interval check: Non-COD selected, ensuring button is enabled.');
             }
        }

    }, 1500); // Check every 1.5 seconds

    // Initial checks with increased and varied delays to improve reliability on page load
    // These initial checks ensure the box is correctly shown/hidden and button state is set on page load.
    setTimeout(updatePlaceOrderButtonState, 100); // Fastest initial button state check
    setTimeout(handlePaymentMethodChange, 150); // Fastest initial box visibility check
    setTimeout(updatePlaceOrderButtonState, 600); // After basic DOM ready
    setTimeout(handlePaymentMethodChange, 650);
    setTimeout(updatePlaceOrderButtonState, 1500); // After potential AJAX updates
    setTimeout(handlePaymentMethodChange, 1550);
    setTimeout(updatePlaceOrderButtonState, 3000); // A later check for complex scenarios
    setTimeout(handlePaymentMethodChange, 3050);
    setTimeout(updatePlaceOrderButtonState, 5000); // A final safety net check
    setTimeout(handlePaymentMethodChange, 5050);

});
