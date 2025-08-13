const express = require("express");
const router = express.Router();
const sessionManager = require("../sessionManager");
const { sendMessage } = require("../whatsappService");
const { text } = require("body-parser");
const { sendTemplateMessageByName } = require("../whatsappService");

// Mechanic wallet endpoint
router.get("/api/mechanic/:id/wallet", (req, res) => {
  const mechanicId = req.params.id;
  const balance = sessionManager.getWallet(mechanicId) || 0;
  res.json({ mechanicId, balance });
});

router.get("/api/reminder/:slug", async (req, res) => {
  const slug = req.params.slug;
  const phone = req.query.phone;
  let textTemplate = "";
  if (!phone) {
    return res.status(400).json({ error: "Missing phone query parameter" });
  }

  if (slug !== "mechanic" && slug !== "shop-owner") {
    return res
      .status(400)
      .json({ error: "Invalid slug, must be mechanic or shop-owner" });
  }

  if (slug === "mechanic") {
    // This is for static message
    textTemplate = "كونوا على أتم الاستعداد، انتم على موعد مع بداية حملة بترولوب غدًا بتاريخ 15 أغسطس\n\nقم بمشاهدة الفيديو التعريفي لمعرفة خطوات تسجيل عمليات تغيير الزيت للعميل وكيفية المشاركة والاستفادة من الحملة";
  } else if (slug === "shop-owner") {
    // This is for static shop owner message
    textTemplate = "This is a reminder for the shop owner.";
  }

  /**
   * Use this code for sending template based message from META
   */

  const termsUrlLabour =
    process.env.PETROLUBE_TERMS_URL_LABOUR ||
    "pdfs/Petrolube-Flyer-LabourManual.pdf";

  // await sendTemplateMessageByName(phone, "mechanic_onboarding_with_links", [
  //   "Usama Naseer",
  //   "Habibi Tires",
  //   termsUrlLabour,
  // ]);

  // ---------------------------------------------------------------------------------------

  /**
   * Use this code for sending Static message
   */

  sendMessage(phone, textTemplate)
    .then(() => {
      res.json({ message: `Sent reminder to ${phone} as ${slug}` });
    })
    .catch((err) => {
      res
        .status(500)
        .json({ error: "Failed to send message", details: err.message });
    });

  return res.json({ message: `Sent reminder to ${phone} as ${slug}` });
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
