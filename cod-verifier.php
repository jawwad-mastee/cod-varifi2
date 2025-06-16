<?php
/*
Plugin Name: COD Verifier for WooCommerce
Description: OTP + Token verification for WooCommerce COD orders
Version: 1.0.0
Author: Your Name
Requires at least: 5.0
Tested up to: 6.4
Requires PHP: 7.4
WC requires at least: 3.0
WC tested up to: 8.0
Text Domain: cod-verifier
Domain Path: /languages
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('COD_VERIFIER_VERSION', '1.0.0');
define('COD_VERIFIER_PLUGIN_URL', plugin_dir_url(__FILE__));
define('COD_VERIFIER_PLUGIN_PATH', plugin_dir_path(__FILE__));

// Main plugin class
class CODVerifier {
    
    public function __construct() {
        add_action('plugins_loaded', array($this, 'init'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        // Add WooCommerce compatibility declaration
        add_action('before_woocommerce_init', array($this, 'declare_compatibility'));
    }
    
    public function declare_compatibility() {
        if (class_exists('\Automattic\WooCommerce\Utilities\FeaturesUtil')) {
            \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
        }
    }
    
    public function init() {
        // Check if WooCommerce is active
        if (!class_exists('WooCommerce')) {
            add_action('admin_notices', array($this, 'woocommerce_missing_notice'));
            return;
        }
        
        // Load text domain
        load_plugin_textdomain('cod-verifier', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Include required files
        $this->include_files();
        
        // Initialize hooks
        $this->init_hooks();
    }
    
    private function include_files() {
        require_once COD_VERIFIER_PLUGIN_PATH . 'includes/settings-page.php';
        require_once COD_VERIFIER_PLUGIN_PATH . 'includes/ajax-handlers.php';
    }
    
    private function init_hooks() {
        // Start session early
        add_action('init', array($this, 'start_session'), 1);
        
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // Add verification box to footer
        add_action('wp_footer', array($this, 'add_verification_box_to_footer'));
        
        // Server-side validation with HIGHEST PRIORITY
        add_action('woocommerce_checkout_process', array($this, 'validate_checkout'), 1);
        
        // Clean up after order
        add_action('woocommerce_thankyou', array($this, 'cleanup_session'));
    }
    
    public function start_session() {
        if (!session_id() && !headers_sent()) {
            session_start();
        }
    }
    
    public function enqueue_scripts() {
        if (is_checkout()) {
            wp_enqueue_script('jquery');
            
            // Main verification script
            wp_enqueue_script(
                'cod-verifier-script',
                COD_VERIFIER_PLUGIN_URL . 'assets/script.js',
                array('jquery'),
                COD_VERIFIER_VERSION,
                true
            );
            
            // Main styles
            wp_enqueue_style(
                'cod-verifier-style',
                COD_VERIFIER_PLUGIN_URL . 'assets/cod-verifier.css',
                array(),
                COD_VERIFIER_VERSION
            );
            
            // Localize script with AJAX data
            wp_localize_script('cod-verifier-script', 'codVerifier', array(
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('cod_verifier_nonce'),
                'enableOTP' => get_option('cod_verifier_enable_otp', '1'),
                'enableToken' => get_option('cod_verifier_enable_token', '1'),
                'testMode' => get_option('cod_verifier_test_mode', '1'),
            ));
        }
    }
    
    public function add_verification_box_to_footer() {
        if (!is_checkout()) {
            return;
        }
        
        $enable_otp = get_option('cod_verifier_enable_otp', '1');
        $enable_token = get_option('cod_verifier_enable_token', '1');
        
        if ($enable_otp === '1' || $enable_token === '1') {
            // Output hidden template wrapper
            echo '<div id="cod-verification-template" style="display: none;">';
            include COD_VERIFIER_PLUGIN_PATH . 'templates/otp-box.php';
            echo '</div>';
        }
    }
    
    public function validate_checkout() {
        // Get the chosen payment method
        $chosen_payment_method = WC()->session->get('chosen_payment_method');
        
        // Also check POST data for payment method
        if (empty($chosen_payment_method) && isset($_POST['payment_method'])) {
            $chosen_payment_method = sanitize_text_field($_POST['payment_method']);
        }
        
        // Skip validation if not COD
        if ($chosen_payment_method !== 'cod') {
            return;
        }
        
        $enable_otp = get_option('cod_verifier_enable_otp', '1');
        $enable_token = get_option('cod_verifier_enable_token', '1');
        
        $errors = array();
        
        // Start session if not started
        if (!session_id()) {
            session_start();
        }
        
        // Validate OTP
        if ($enable_otp === '1') {
            $otp_verified_session = isset($_SESSION['cod_otp_verified']) ? $_SESSION['cod_otp_verified'] : false;
            $otp_verified_post = isset($_POST['cod_otp_verified']) ? sanitize_text_field($_POST['cod_otp_verified']) : '0';
            
            if (!$otp_verified_session && $otp_verified_post !== '1') {
                $errors[] = __('Please verify your phone number with OTP before placing the order.', 'cod-verifier');
            }
        }
        
        // Validate Token
        if ($enable_token === '1') {
            $token_paid_session = isset($_SESSION['cod_token_paid']) ? $_SESSION['cod_token_paid'] : false;
            $token_verified_post = isset($_POST['cod_token_verified']) ? sanitize_text_field($_POST['cod_token_verified']) : '0';
            
            if (!$token_paid_session && $token_verified_post !== '1') {
                $errors[] = __('Please complete the ₹1 token payment before placing the order.', 'cod-verifier');
            }
        }
        
        // If there are errors, prevent order processing
        if (!empty($errors)) {
            foreach ($errors as $error) {
                wc_add_notice($error, 'error');
            }
            
            // Stop processing immediately for AJAX requests
            if (wp_doing_ajax()) {
                wp_send_json_error(array(
                    'messages' => implode('<br>', $errors),
                    'refresh' => false,
                    'reload' => false
                ));
            }
            
            // For non-AJAX, throw exception to stop checkout
            throw new Exception(implode(' ', $errors));
        }
    }
    
    public function cleanup_session($order_id) {
        // Clean up session variables
        if (isset($_SESSION['cod_otp'])) unset($_SESSION['cod_otp']);
        if (isset($_SESSION['cod_otp_phone'])) unset($_SESSION['cod_otp_phone']);
        if (isset($_SESSION['cod_otp_time'])) unset($_SESSION['cod_otp_time']);
        if (isset($_SESSION['cod_otp_verified'])) unset($_SESSION['cod_otp_verified']);
        if (isset($_SESSION['cod_token_paid'])) unset($_SESSION['cod_token_paid']);
    }
    
    public function woocommerce_missing_notice() {
        echo '<div class="notice notice-error"><p>';
        echo __('COD Verifier requires WooCommerce to be installed and active.', 'cod-verifier');
        echo '</p></div>';
    }
    
    public function activate() {
        // Set default options
        add_option('cod_verifier_enable_otp', '1');
        add_option('cod_verifier_enable_token', '1');
        add_option('cod_verifier_test_mode', '1');
        add_option('cod_verifier_fast2sms_api_key', '');
        add_option('cod_verifier_razorpay_key_id', '');
        add_option('cod_verifier_razorpay_key_secret', '');
    }
    
    public function deactivate() {
        // Clean up if needed
    }
}

// Initialize the plugin
new CODVerifier();
?>