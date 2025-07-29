const parsePhoneNumber = require('libphonenumber-js');

/**
 * Formats phone number to international format without + or spaces
 * @param {string} input - Raw phone number input
 * @param {string} defaultCountry - Default country code (e.g., 'SA', 'PK')
 * @returns {object} - { isValid, international, error, country, formatted }
 */
function formatPhoneNumber(input, defaultCountry = 'SA') {
    try {
        // Clean the input first
        const cleanInput = input.replace(/\s+/g, '').trim();
        
        if (!cleanInput) {
            return { 
                isValid: false, 
                error: '❌ رقم الهاتف لا يمكن أن يكون فارغاً\n❌ Phone number cannot be empty' 
            }
        }

        // Parse the phone number
        const phoneNumber = parsePhoneNumber(cleanInput, defaultCountry);
        
        if (!phoneNumber) {
            return { 
                isValid: false, 
                error: '❌ تنسيق رقم الهاتف غير صحيح\n❌ Invalid phone number format' 
            }
        }
        
        // Get international format and remove + and spaces
        const international = phoneNumber.number.replace(/[\s\+]/g, '');
        
        return {
            isValid: true,
            international: international, // "966569440162"
            country: phoneNumber.country,
            formatted: phoneNumber.formatInternational(), // "+966 56 944 0162" (for display)
            national: phoneNumber.formatNational() // "(056) 944-0162" (for display)
        }
    } catch (error) {
        console.error('Phone number parsing error:', error);
        return { 
            isValid: false, 
            error: '❌ فشل في تحليل رقم الهاتف\n❌ Phone number parsing failed' 
        }
    }
}

/**
 * Validates if number is from specified country
 * @param {string} input - Phone number input
 * @param {string} country - Country code to validate against
 * @returns {boolean} - True if number is from specified country
 */
function validateCountryNumber(input, country = 'SA') {
    try {
        const cleanInput = input.replace(/\s+/g, '').trim();
        const phoneNumber = parsePhoneNumber(cleanInput, country);
        return phoneNumber && phoneNumber.country === country;
    } catch (error) {
        return false;
    }
}

/**
 * Gets the country code from a phone number
 * @param {string} input - Phone number input
 * @returns {string|null} - Country code or null if invalid
 */
function getCountryFromNumber(input) {
    try {
        const cleanInput = input.replace(/\s+/g, '').trim();
        const phoneNumber = parsePhoneNumber(cleanInput);
        return phoneNumber ? phoneNumber.country : null;
    } catch (error) {
        return null;
    }
}

/**
 * Validates if a number is a valid mobile number
 * @param {string} input - Phone number input
 * @param {string} defaultCountry - Default country code
 * @returns {boolean} - True if valid mobile number
 */
function isValidMobileNumber(input, defaultCountry = 'SA') {
    try {
        const cleanInput = input.replace(/\s+/g, '').trim();
        const phoneNumber = parsePhoneNumber(cleanInput, defaultCountry);
        
        if (!phoneNumber) return false;
        
        // Check if it's a mobile number (if metadata supports it)
        try {
            const numberType = phoneNumber.getType();
            return numberType === 'MOBILE' || numberType === 'FIXED_LINE_OR_MOBILE';
        } catch (error) {
            // If getType() fails (no metadata), just check if it's a valid number
            return phoneNumber.isValid();
        }
    } catch (error) {
        return false;
    }
}

/**
 * Custom Saudi phone number formatter with specific logic
 * @param {string} input - Raw phone number input
 * @returns {object} - { isValid, international, error, formatted }
 */
function formatSaudiPhoneNumber(input) {
    try {
        // Clean the input first
        const cleanInput = input.replace(/\s+/g, '').trim();
        
        if (!cleanInput) {
            return { 
                isValid: false, 
                error: '❌ رقم الهاتف لا يمكن أن يكون فارغاً\n❌ Phone number cannot be empty' 
            }
        }

        let formattedNumber = cleanInput;

        // Remove + if present
        if (formattedNumber.startsWith('+')) {
            formattedNumber = formattedNumber.substring(1);
        }

        // If starts with 9 and length is 12-13, treat as international format
        if (formattedNumber.startsWith('9') && (formattedNumber.length === 12 || formattedNumber.length === 13)) {
            // Already in international format, just return
            return {
                isValid: true,
                international: formattedNumber,
                formatted: `+${formattedNumber}`,
                national: formattedNumber.substring(3) // Remove country code for national format
            }
        }

        // If starts with 9 and length is 11, it could be a country code + number (like Pakistan 92)
        if (formattedNumber.startsWith('9') && formattedNumber.length === 11) {
            // Already in international format, just return
            return {
                isValid: true,
                international: formattedNumber,
                formatted: `+${formattedNumber}`,
                national: formattedNumber.substring(2) // Remove country code for national format
            }
        }

        // If starts with 966 and length is 12, it's already in Saudi format
        if (formattedNumber.startsWith('966') && formattedNumber.length === 12) {
            return {
                isValid: true,
                international: formattedNumber,
                formatted: `+${formattedNumber}`,
                national: formattedNumber.substring(3) // Remove country code for national format
            }
        }

        // If starts with 5 (Saudi mobile), convert to 9665xxx
        if (formattedNumber.startsWith('5') && formattedNumber.length === 9) {
            const saudiNumber = `966${formattedNumber}`;
            return {
                isValid: true,
                international: saudiNumber,
                formatted: `+${saudiNumber}`,
                national: formattedNumber
            }
        }

        // If starts with 05 (Saudi mobile with 0), convert to 9665xxx
        if (formattedNumber.startsWith('05') && formattedNumber.length === 10) {
            const saudiNumber = `966${formattedNumber.substring(1)}`;
            return {
                isValid: true,
                international: saudiNumber,
                formatted: `+${saudiNumber}`,
                national: formattedNumber
            }
        }

        // If it's a 9-digit number starting with 5, assume Saudi mobile
        if (formattedNumber.length === 9 && formattedNumber.startsWith('5')) {
            const saudiNumber = `966${formattedNumber}`;
            return {
                isValid: true,
                international: saudiNumber,
                formatted: `+${saudiNumber}`,
                national: formattedNumber
            }
        }

        // If it's a 10-digit number starting with 05, assume Saudi mobile
        if (formattedNumber.length === 10 && formattedNumber.startsWith('05')) {
            const saudiNumber = `966${formattedNumber.substring(1)}`;
            return {
                isValid: true,
                international: saudiNumber,
                formatted: `+${saudiNumber}`,
                national: formattedNumber
            }
        }

        // If it's a 12-digit number starting with 966, it's already in Saudi format
        if (formattedNumber.length === 12 && formattedNumber.startsWith('966')) {
            return {
                isValid: true,
                international: formattedNumber,
                formatted: `+${formattedNumber}`,
                national: formattedNumber.substring(3)
            }
        }

        // If it's a 13-digit number starting with 966, it's already in Saudi format
        if (formattedNumber.length === 13 && formattedNumber.startsWith('966')) {
            return {
                isValid: true,
                international: formattedNumber,
                formatted: `+${formattedNumber}`,
                national: formattedNumber.substring(3)
            }
        }

        // If none of the above patterns match, try the original libphonenumber-js
        // but only accept if it's a valid Saudi mobile number
        const phoneNumber = parsePhoneNumber(cleanInput, 'SA');
        if (phoneNumber && phoneNumber.isValid() && phoneNumber.country === 'SA') {
            const international = phoneNumber.number.replace(/[\s\+]/g, '');
            // Additional check: ensure it's a mobile number starting with 5
            if (international.startsWith('9665') || international.startsWith('9666')) {
                return {
                    isValid: true,
                    international: international,
                    formatted: phoneNumber.formatInternational(),
                    national: phoneNumber.formatNational()
                }
            }
        }

        return { 
            isValid: false, 
            error: '❌ تنسيق رقم الهاتف غير صحيح\n❌ Invalid phone number format\n\nيرجى إدخال رقم هاتف صحيح:\nPlease enter a valid phone number:\n\n• 5xxxxxxxx (رقم سعودي - 9 أرقام تبدأ بـ 5)\n• 05xxxxxxxx (رقم سعودي - 10 أرقام تبدأ بـ 05)\n• 9665xxxxxxxx (رقم سعودي - 12 رقم مع رمز البلد)\n• +9665xxxxxxxx (رقم سعودي - مع علامة +)\n• 9xxxxxxxxxx (رقم دولي - 11+ رقم يبدأ بـ 9)' 
        }

    } catch (error) {
        console.error('Phone number parsing error:', error);
        return { 
            isValid: false, 
            error: '❌ فشل في تحليل رقم الهاتف\n❌ Phone number parsing failed' 
        }
    }
}

module.exports = {
    formatPhoneNumber,
    validateCountryNumber,
    getCountryFromNumber,
    isValidMobileNumber,
    formatSaudiPhoneNumber
}; 