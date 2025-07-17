const express = require('express');
const router = express.Router();
const sessionManager = require('../sessionManager');

// Mechanic wallet endpoint
router.get('/api/mechanic/:id/wallet', (req, res) => {
    const mechanicId = req.params.id;
    const balance = sessionManager.getWallet(mechanicId) || 0;
    res.json({ mechanicId, balance });
});

// Mechanic logs endpoint
router.get('/api/mechanic/:id/logs', (req, res) => {
    const mechanicId = req.params.id;
    const logs = sessionManager.getOilChangeLogsByMechanic(mechanicId);
    res.json({ mechanicId, logs });
});

// Statistics endpoint
router.get('/api/statistics', (req, res) => {
    const logs = sessionManager.getOilChangeLogs();
    const totalOilChanges = logs.length;
    const confirmedOilChanges = logs.filter(log => log.status === 'confirmed').length;
    const totalRewards = Array.from(sessionManager.mechanicWallets.values()).reduce((sum, balance) => sum + balance, 0);
    const activeMechanics = sessionManager.mechanicWallets.size;
    res.json({
        totalOilChanges,
        confirmedOilChanges,
        pendingConfirmations: totalOilChanges - confirmedOilChanges,
        totalRewards,
        activeMechanics
    });
});

module.exports = router; 