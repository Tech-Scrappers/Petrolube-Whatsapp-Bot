// In-memory storage (replace with database in production)
const mechanicSessions = new Map();
const customerConfirmations = new Map();
const mechanicWallets = new Map();
const oilChangeLogs = new Map();
const customerToLog = new Map(); // customerMobile -> logId
const processedMessageIds = new Set(); // Deduplication for WhatsApp message IDs
const inactivityTimers = new Map(); // sender -> timeout handle

// Session management
function getSession(sender) {
    return mechanicSessions.get(sender) || { state: 'menu', data: {} };
}
function setSession(sender, session) {
    mechanicSessions.set(sender, session);
}

// Wallet management
function getWallet(mechanicId) {
    return mechanicWallets.get(mechanicId) || 0;
}
function setWallet(mechanicId, amount) {
    mechanicWallets.set(mechanicId, amount);
}
function hasWallet(mechanicId) {
    return mechanicWallets.has(mechanicId);
}

// Oil change log management
function getOilChangeLogs() {
    return Array.from(oilChangeLogs.values());
}
function addOilChangeLog(key, logEntry) {
    oilChangeLogs.set(key, logEntry);
}
function getOilChangeLogByKey(key) {
    return oilChangeLogs.get(key);
}
function getOilChangeLogsByMechanic(mechanicId) {
    return Array.from(oilChangeLogs.values()).filter(log => log.mechanicId === mechanicId);
}

// Customer to log mapping
function setCustomerToLog(customerMobile, logId) {
    customerToLog.set(customerMobile, logId);
}
function getCustomerToLog(customerMobile) {
    return customerToLog.get(customerMobile);
}

// Recovery functions for customers who missed approval messages
function hasPendingApproval(customerMobile) {
    return customerToLog.has(customerMobile) && 
           oilChangeLogs.has(customerToLog.get(customerMobile)) &&
           oilChangeLogs.get(customerToLog.get(customerMobile)).status === "pending_confirmation";
}

function recoverCustomerApproval(submissionData) {
    // submissionData should contain: { id, mechanic_id, customer_phone, car_plate_number, qr_codes, created_at }
    const logId = `${submissionData.mechanic_id}_${Date.now()}_recovered`;
    
    const logEntry = {
        mechanicId: submissionData.mechanic_id,
        customerMobile: submissionData.customer_phone,
        plateNumber: submissionData.car_plate_number,
        qrCodes: submissionData.qr_codes || [],
        timestamp: submissionData.created_at || new Date().toISOString(),
        status: "pending_confirmation",
        submissionId: submissionData.id,
        recovered: true, // Flag to indicate this was recovered
        recoveredAt: new Date().toISOString()
    };
    
    // Add the log
    addOilChangeLog(logId, logEntry);
    
    // Map customer to log
    setCustomerToLog(submissionData.customer_phone, logId);
    
    return logId;
}

function bulkRecoverCustomerApprovals(submissionsArray) {
    const results = [];
    
    for (const submission of submissionsArray) {
        try {
            const logId = recoverCustomerApproval(submission);
            results.push({
                customerPhone: submission.customer_phone,
                submissionId: submission.id,
                logId: logId,
                status: "recovered",
                message: "Successfully recovered customer approval log"
            });
        } catch (error) {
            results.push({
                customerPhone: submission.customer_phone,
                submissionId: submission.id,
                status: "failed",
                error: error.message
            });
        }
    }
    
    return results;
}

function getRecoveredLogs() {
    return Array.from(oilChangeLogs.values()).filter(log => log.recovered === true);
}

function isMessageProcessed(messageId) {
    return processedMessageIds.has(messageId);
}

function markMessageProcessed(messageId) {
    processedMessageIds.add(messageId);
}

function setInactivityTimer(sender, callback, delayMs) {
    clearInactivityTimer(sender);
    const handle = setTimeout(() => {
        inactivityTimers.delete(sender);
        callback();
    }, delayMs);
    inactivityTimers.set(sender, handle);
}

function clearInactivityTimer(sender) {
    const handle = inactivityTimers.get(sender);
    if (handle) {
        clearTimeout(handle);
        inactivityTimers.delete(sender);
    }
}

function hasInactivityTimer(sender) {
    return inactivityTimers.has(sender);
}

module.exports = {
    getSession,
    setSession,
    getWallet,
    setWallet,
    hasWallet,
    getOilChangeLogs,
    addOilChangeLog,
    getOilChangeLogByKey,
    getOilChangeLogsByMechanic,
    setCustomerToLog,
    getCustomerToLog,
    hasPendingApproval,
    recoverCustomerApproval,
    bulkRecoverCustomerApprovals,
    getRecoveredLogs,
    mechanicSessions,
    customerConfirmations,
    mechanicWallets,
    oilChangeLogs,
    customerToLog,
    processedMessageIds,
    isMessageProcessed,
    markMessageProcessed,
    inactivityTimers,
    setInactivityTimer,
    clearInactivityTimer,
    hasInactivityTimer
}; 