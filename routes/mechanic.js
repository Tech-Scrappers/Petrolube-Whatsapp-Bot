const express = require("express");
const router = express.Router();
const sessionManager = require("../sessionManager");
const { sendMessage, sendVideoMessage } = require("../whatsappService");
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
  let videoUrl = "";
  
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
    videoUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/public/videos/mechanic-intro.mp4`;
  } else if (slug === "shop-owner") {
    // This is for static shop owner message
    textTemplate = "This is a reminder for the shop owner.";
    videoUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/public/videos/shop-owner-intro.mp4`;
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
   * Use this code for sending Static message and video
   */

  try {
    // Send text message first
    await sendMessage(phone, textTemplate);
    console.log(`Text message sent successfully to ${phone}`);
    
    // Send video message
    await sendVideoMessage(phone, videoUrl);
    console.log(`Video message sent successfully to ${phone}`);
    
    res.json({ 
      message: `Sent reminder and video to ${phone} as ${slug}`,
      textSent: true,
      videoSent: true
    });
  } catch (err) {
    console.error("Error sending messages:", err);
    res
      .status(500)
      .json({ 
        error: "Failed to send messages", 
        details: err.message,
        textSent: false,
        videoSent: false
      });
  }
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
