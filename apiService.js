const axios = require('axios');
require('dotenv').config();

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const API_TOKEN = process.env.API_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PYTHON_QR_API_URL = process.env.PYTHON_QR_API_URL;
const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

// Validate mechanic by phone number
async function validateMechanicByPhone(phoneNumber) {
    try {
        const normalizedPhone = phoneNumber.replace(/^\+/, '').replace(/\s+/g, '');
        const apiUrl = `${EXTERNAL_API_BASE_URL}/bot/mechanics?mobile_number=${encodeURIComponent(normalizedPhone)}`;
        const response = await axios.get(apiUrl);
        if (response.data && response.data.data) {
            return {
                id: response.data.data.id,
                name: response.data.data.full_name,
                nameAr: response.data.data.full_name,
                phone: normalizedPhone,
                wallet: 0
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error verifying mechanic by phone:', error?.response?.data || error.message);
        return null;
    }
}

// Validate QR codes (dummy for now)
async function validateQRCodes(qrCodes) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
        valid: qrCodes,
        invalid: [],
        isValid: true,
        message: `✅ ${qrCodes.length} QR codes scanned successfully / تم مسح ${qrCodes.length} رموز QR بنجاح`
    };
}

// Validate customer (dummy for now)
async function validateCustomer(mobileNumber, plateNumber) {
    await new Promise(resolve => setTimeout(resolve, 150));
    return { isValid: true, message: "Customer data accepted / تم قبول بيانات العميل" };
}

// Update mechanic wallet (dummy for now)
async function updateMechanicWallet(mechanicId, amount, mechanicWallets) {
    if (!mechanicWallets.has(mechanicId)) {
        mechanicWallets.set(mechanicId, 0);
    }
    const currentBalance = mechanicWallets.get(mechanicId);
    const newBalance = currentBalance + amount;
    mechanicWallets.set(mechanicId, newBalance);
    return newBalance;
}

// Log oil change (dummy for now)
async function logOilChange(mechanicId, customerMobile, plateNumber, qrCodes, oilChangeLogs) {
    const logEntry = {
        mechanicId,
        customerMobile,
        plateNumber,
        qrCodes,
        timestamp: new Date().toISOString(),
        status: 'pending_confirmation'
    };
    const key = `${mechanicId}_${Date.now()}`;
    oilChangeLogs.set(key, logEntry);
    return key;
}

module.exports = {
    validateMechanicByPhone,
    validateQRCodes,
    validateCustomer,
    updateMechanicWallet,
    logOilChange,
    WHATSAPP_API_URL,
    API_TOKEN,
    PHONE_NUMBER_ID,
    OPENAI_API_KEY,
    PYTHON_QR_API_URL,
    EXTERNAL_API_BASE_URL
}; 