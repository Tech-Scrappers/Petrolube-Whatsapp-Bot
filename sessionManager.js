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