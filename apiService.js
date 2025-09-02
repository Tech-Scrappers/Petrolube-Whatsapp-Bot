const axios = require('axios');
const FormData = require('form-data');
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
        const response = await axios.get(apiUrl, {
            headers: {
                'X-Petrolube-Secret-Key': process.env.PETROLUBE_SECRET_KEY
            }
        });
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

// Validate QR codes (real API call)
async function validateQRCodes(qrCodes) {
    try {
        const response = await axios.post(
            `${EXTERNAL_API_BASE_URL}/bot/validate-qr-codes`,
            { qr_codes: qrCodes },
            {
                headers: {
                    'X-Petrolube-Secret-Key': process.env.PETROLUBE_SECRET_KEY,
                    'Content-Type': 'application/json'
                },
                validateStatus: () => true // allow handling all status codes manually
            }
        );
        if (response.status === 204) {
            return { isValid: true, message: '✅ رموز QR صالحة وغير مكررة\n✅ QR codes are valid and not duplicated.' };
        } else if (response.status === 422) {
            let msg = '❌ رموز QR مكررة\n❌ Duplicate QR codes.';
            if (response.data && response.data.message) msg = response.data.message;
            return { isValid: false, message: msg };
        } else {
            let msg = '❌ حدث خطأ أثناء التحقق من رموز QR\n❌ Error validating QR codes.';
            if (response.data && response.data.message) msg = response.data.message;
            return { isValid: false, message: msg };
        }
    } catch (error) {
        let message = '❌ QR code validation failed. Please try again or contact support.';
        if (error.response && error.response.data && error.response.data.message) {
            message = error.response.data.message;
        } else if (error.message) {
            message = error.message;
        }
        return {
            isValid: false,
            message
        };
    }
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

// Create oil change conversation log
async function createOilChangeLog(mechanicId, parentId = null, step = 1, status = "passed", details = null, message = null) {
    try {
        const logData = {
            event: 'oil_change_submission',
            parent_id: parentId,
            step: step,
            status: status,
            details: details,
            message: message
        };

        const response = await axios.post(
            `${EXTERNAL_API_BASE_URL}/bot/mechanics/${mechanicId}/oil-change-logs`,
            logData,
            {
                headers: {
                    'X-Petrolube-Secret-Key': process.env.PETROLUBE_SECRET_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.status >= 200 && response.status < 300) {
            return response.data;
        } else {
            console.error('Error creating oil change log:', response.status, response.data);
            return null;
        }
    } catch (error) {
        console.error('Error creating oil change log:', error?.response?.data || error.message);
        return null;
    }
}

// Fetch leaderboard data
async function fetchLeaderboard(mechanicId) {
    try {
        const response = await axios.get(`${EXTERNAL_API_BASE_URL}/bot/leaderboard/${mechanicId}`, {
            headers: {
                'X-Petrolube-Secret-Key': process.env.PETROLUBE_SECRET_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching leaderboard:', error?.response?.data || error.message);
        return null;
    }
}

// Fetch mechanic wallet data
async function fetchMechanicWallet(mechanicId) {
    try {
        const response = await axios.get(`${EXTERNAL_API_BASE_URL}/bot/mechanics/${mechanicId}/wallet`, {
            headers: {
                'X-Petrolube-Secret-Key': process.env.PETROLUBE_SECRET_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching mechanic wallet:', error?.response?.data || error.message);
        return null;
    }
}

// Validate car plate (duplication check)
async function validateCarPlate(carPlateNumber) {
    try {
        const response = await axios.post(
            `${EXTERNAL_API_BASE_URL}/bot/validate-car-plate`,
            { car_plate_number: carPlateNumber },
            {
                headers: {
                    'X-Petrolube-Secret-Key': process.env.PETROLUBE_SECRET_KEY,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                validateStatus: () => true // allow handling all status codes manually
            }
        );
        if (response.status === 204) {
            return { isValid: true, message: '✅ رقم اللوحة صالح وغير مكرر\n✅ Plate number is valid and not duplicated.' };
        } else if (response.status === 422) {
            let msg = '❌ رقم اللوحة مكرر\n❌ Duplicate plate number.';
            if (response.data && response.data.message) msg = response.data.message;
            return { isValid: false, message: msg };
        } else {
            let msg = '❌ حدث خطأ أثناء التحقق من رقم اللوحة\n❌ Error validating plate number.';
            if (response.data && response.data.message) msg = response.data.message;
            return { isValid: false, message: msg };
        }
    } catch (error) {
        let message = '❌ Car plate validation failed. Please try again or contact support.';
        if (error.response && error.response.data && error.response.data.message) {
            message = error.response.data.message;
        } else if (error.message) {
            message = error.message;
        }
        return {
            isValid: false,
            message
        };
    }
}

// Validate customer phone (duplication check)
async function validateCustomerPhone(customerPhone) {
    try {
        // Ensure the phone number is in international format
        const { formatSaudiPhoneNumber } = require('./phoneNumberUtils');
        const phoneResult = formatSaudiPhoneNumber(customerPhone);
        
        if (!phoneResult.isValid) {
            return { isValid: false, message: phoneResult.error };
        }
        
        const response = await axios.post(
            `${EXTERNAL_API_BASE_URL}/bot/validate-customer-phone`,
            { customer_phone: phoneResult.international },
            {
                headers: {
                    'X-Petrolube-Secret-Key': process.env.PETROLUBE_SECRET_KEY,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                validateStatus: () => true // allow handling all status codes manually
            }
        );
        if (response.status === 204) {
            return { isValid: true, message: '✅ رقم الهاتف صالح وغير مكرر\n✅ Customer phone is valid and not duplicated.' };
        } else if (response.status === 422) {
            let msg = '❌ رقم الهاتف مكرر\n❌ Duplicate customer phone.';
            if (response.data && response.data.message) msg = response.data.message;
            return { isValid: false, message: msg };
        } else {
            let msg = '❌ حدث خطأ أثناء التحقق من رقم الهاتف\n❌ Error validating customer phone.';
            if (response.data && response.data.message) msg = response.data.message;
            return { isValid: false, message: msg };
        }
    } catch (error) {
        let message = '❌ Customer phone validation failed. Please try again or contact support.';
        if (error.response && error.response.data && error.response.data.message) {
            message = error.response.data.message;
        } else if (error.message) {
            message = error.message;
        }
        return {
            isValid: false,
            message
        };
    }
}

module.exports = {
    validateMechanicByPhone,
    validateQRCodes,
    validateCustomer,
    updateMechanicWallet,
    logOilChange,
    fetchLeaderboard,
    fetchMechanicWallet,
    WHATSAPP_API_URL,
    API_TOKEN,
    PHONE_NUMBER_ID,
    OPENAI_API_KEY,
    PYTHON_QR_API_URL,
    EXTERNAL_API_BASE_URL,
    validateCarPlate,
    validateCustomerPhone,
    createOilChangeLog
}; 