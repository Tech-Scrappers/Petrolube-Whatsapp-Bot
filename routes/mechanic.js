const express = require("express");
const router = express.Router();
const sessionManager = require("../sessionManager");
const { sendMessage } = require("../whatsappService");
const { text } = require("body-parser");

// Mechanic wallet endpoint
router.get("/api/mechanic/:id/wallet", (req, res) => {
  const mechanicId = req.params.id;
  const balance = sessionManager.getWallet(mechanicId) || 0;
  res.json({ mechanicId, balance });
});

router.get("/api/reminder/:slug", (req, res) => {
  const slug = req.params.slug;
  const phone = req.query.phone;
  let textTemplate = "";
  if (!phone) {
    return res.status(400).json({ error: "Missing phone query parameter" });
  }
  if (slug !== "mechanic" && slug !== "driver") {
    return res
      .status(400)
      .json({ error: "Invalid slug, must be mechanic or driver" });
  }

  if (slug === "mechanic") {
    textTemplate = "This is a reminder for the mechanic.";
  } else if (slug === "owner") {
    textTemplate = "This is a reminder for the driver.";
  }

  sendMessage(phone, textTemplate)
    .then(() => {
      res.json({ message: `Sent reminder to ${phone} as ${slug}` });
    })
    .catch((err) => {
      res
        .status(500)
        .json({ error: "Failed to send message", details: err.message });
    });
});

// Mechanic logs endpoint
router.get("/api/mechanic/:id/logs", (req, res) => {
  const mechanicId = req.params.id;
  const logs = sessionManager.getOilChangeLogsByMechanic(mechanicId);
  res.json({ mechanicId, logs });
});

// Statistics endpoint
router.get("/api/statistics", (req, res) => {
  const logs = sessionManager.getOilChangeLogs();
  const totalOilChanges = logs.length;
  const confirmedOilChanges = logs.filter(
    (log) => log.status === "confirmed"
  ).length;
  const totalRewards = Array.from(
    sessionManager.mechanicWallets.values()
  ).reduce((sum, balance) => sum + balance, 0);
  const activeMechanics = sessionManager.mechanicWallets.size;
  res.json({
    totalOilChanges,
    confirmedOilChanges,
    pendingConfirmations: totalOilChanges - confirmedOilChanges,
    totalRewards,
    activeMechanics,
  });
});

module.exports = router;
