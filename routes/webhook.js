const express = require("express");
const router = express.Router();
const {
  sendMessage,
  downloadImage,
  sendTypingIndicator,
} = require("../whatsappService");
const { extractNumberPlate, detectNumberOfFoils } = require("../openaiService");
const sessionManager = require("../sessionManager");
const {
  validateMechanicByPhone,
  validateQRCodes,
  validateCustomer,
  updateMechanicWallet,
  fetchLeaderboard,
  fetchMechanicWallet,
  WHATSAPP_API_URL,
  API_TOKEN,
  PHONE_NUMBER_ID,
  OPENAI_API_KEY,
  PYTHON_QR_API_URL,
  EXTERNAL_API_BASE_URL,
} = require("../apiService");
const { showMainMenu } = require("../menuService");
const { sendTemplateMessageByName } = require("../whatsappService");

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// Campaign status configuration
const CAMPAIGN_ACTIVE = process.env.CAMPAIGN_ACTIVE === "true" || false;

// Add this near the top, after your imports
const goMenuButton = [
  {
    type: "reply",
    reply: {
      id: "go_menu",
      title: "القائمة | Menu",
    },
  },
];

// Webhook verification
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    console.log("Webhook verified");
    res.status(200).send(challenge);
  } else {
    console.log("Webhook verification failed");
    res.sendStatus(403);
  }
});

// Endpoint to send shop registration template message
router.post("/send-shop-registration-message", async (req, res) => {
  const { shop_owner_number, shop_owner_name, shop_name } = req.body;
  if (!shop_owner_number || !shop_owner_name || !shop_name) {
    return res.status(400).json({
      error:
        "Missing required fields: shop_owner_number, shop_owner_name, shop_name",
    });
  }
  try {
    // Get the terms and conditions URL from environment variable
    const termsUrlOwner =
      process.env.PETROLUBE_TERMS_URL_OWNER ||
      "pdfs/Petrolube-Flyer-OwnerManual.pdf";

    // Send English message
    await sendTemplateMessageByName(
      shop_owner_number,
      "shop_onboarding_with_links",
      [shop_owner_name, shop_name, termsUrlOwner]
    );

    // Send Arabic message
    await sendTemplateMessageByName(
      shop_owner_number,
      "shop_ownboarding_arabic",
      [shop_owner_name, shop_name, termsUrlOwner]
    );

    res.status(200).json({
      success: true,
      message: "Shop registration messages sent (English and Arabic).",
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to send message." });
  }
});

// Endpoint to send shop registration template message
router.post("/send-customer-reminder-message", async (req, res) => {
  const { mobile_number } = req.body;
  if (!mobile_number) {
    return res.status(400).json({
      error: "Missing required fields: mobile_number",
    });
  }
  try {
    // Send English message
    await sendTemplateMessageByName(
      mobile_number,
      "customer_reminder_oil_change",
      []
    );

    res.status(200).json({
      success: true,
      message: "Customer reminder message sent.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to send message." });
  }
});

// Endpoint to send mechanic registration template message
router.post("/send-mechanic-registration-message", async (req, res) => {
  const { full_name, mobile_number, shop_name } = req.body;
  if (!full_name || !mobile_number || !shop_name) {
    return res.status(400).json({
      error: "Missing required fields: full_name, mobile_number, shop_name",
    });
  }
  try {
    // Remove '+' from mobile number if present
    const cleanMobileNumber = mobile_number.replace(/^\+/, "");

    // Get the terms and conditions URL from environment variable
    const termsUrlLabour =
      process.env.PETROLUBE_TERMS_URL_LABOUR ||
      "pdfs/Petrolube-Flyer-LabourManual.pdf";

    await sendTemplateMessageByName(
      cleanMobileNumber,
      "mechanic_onboarding_with_links",
      [full_name, shop_name, termsUrlLabour]
    );
    res
      .status(200)
      .json({ success: true, message: "Mechanic registration message sent." });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to send message." });
  }
});

// Test endpoint for sending WhatsApp template messages
router.post("/test-template-message", async (req, res) => {
  const { to, templateName, parameters } = req.body;
  if (!to || !templateName) {
    return res
      .status(400)
      .json({ error: "Missing required fields: to, templateName" });
  }
  try {
    await sendTemplateMessageByName(to, templateName, parameters || []);
    res.status(200).json({ success: true, message: "Template message sent." });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to send template message.",
      details: error?.response?.data || null,
    });
  }
});

// Utility: scanQRCodes using Python API
const axios = require("axios");
const FormData = require("form-data");
async function scanQRCodes(imageBuffer) {
  try {
    const form = new FormData();
    form.append("file", imageBuffer, { filename: "image.jpg" });
    const response = await axios.post(process.env.PYTHON_QR_API_URL, form, {
      headers: {
        ...form.getHeaders(),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error scanning QR codes:", error);
    return {
      results: [],
      summary: { successfully_decoded: 0, total_qr_codes_found: 0 },
    };
  }
}
// Utility: generateSpinWheelLink
function generateSpinWheelLink(customerMobile, confirmationId) {
  return `https://your-domain.com/spin-wheel?mobile=${customerMobile}&confirmation=${confirmationId}`;
}
const INACTIVITY_REMINDER_MS = 5 * 60 * 1000; // 5 minutes
const inactivityReminderText = `يبدو أنك لم تكمل العملية بعد. يمكنك المتابعة أو العودة للقائمة الرئيسية.
It looks like you haven't finished your submission. You can continue or go back to the main menu.`;

// Main webhook handler (POST)
router.post("/webhook", (req, res) => {
  try {
    if (!req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      return res.status(200).send("OK");
    }
    const message = req.body.entry[0].changes[0].value.messages[0];
    const messageId = message.id;
    // Deduplication: check if already processed
    if (sessionManager.isMessageProcessed(messageId)) {
      return res.sendStatus(200);
    }
    sessionManager.markMessageProcessed(messageId);
    // Respond 200 OK immediately
    res.sendStatus(200);
    // Process message asynchronously
    setImmediate(async () => {
      try {
        const sender = message.from;
        // Show typing indicator before processing
        await sendTypingIndicator(sender, messageId);
        console.log(
          "📨 Message received from:",
          sender,
          "Type:",
          message.type,
          "Message: ",
          message.text?.body || "Cannot find message!"
        );

        // Check if campaign is active
        if (!CAMPAIGN_ACTIVE) {
          console.log(
            "🚫 Campaign is not active, sending campaign not started message"
          );
          await sendMessage(
            sender,
            `🚫 الحملة لم تبدأ بعد
🚫 Campaign has not started yet

يرجى الانتظار حتى بدء الحملة الرسمية
Please wait for the official campaign launch

سيتم إشعار جميع الميكانيكيين المسجلين عند بدء الحملة
All registered mechanics will be notified when the campaign starts`
          );
          return;
        }

        let session = sessionManager.getSession(sender);
        const resetInactivityTimer = () => {
          sessionManager.clearInactivityTimer(sender);
          if (session.state !== "menu") {
            sessionManager.setInactivityTimer(
              sender,
              async () => {
                await sendMessage(sender, inactivityReminderText, goMenuButton);
              },
              INACTIVITY_REMINDER_MS
            );
          }
        };

        const clearInactivityTimer = () => {
          sessionManager.clearInactivityTimer(sender);
        };
        resetInactivityTimer();

        if (message.type === "text") {
          const text = message.text.body.toLowerCase().trim();
          // Handle menu navigation
          if (text === "1" || text === "start" || text === "oil change") {
            const mechanic = await validateMechanicByPhone(sender);
            if (mechanic) {
              session.data.mechanicId = mechanic.id;
              session.data.mechanicName = mechanic.name;
              session.data.mechanicNameAr = mechanic.nameAr;
              session.state = "qr_codes";
              sessionManager.setSession(sender, session);
              await sendMessage(
                sender,
                `✅ تم التحقق من الميكانيكي: ${mechanic.nameAr}
✅ Mechanic verified: ${mechanic.name}

📸 يرجى إرسال صورة للأغطية الدائرية (رموز QR)
📸 Please send a photo of the petromin foils (QR codes)

*ملاحظة:* تأكد من أن جميع الأغطية الدائرية مرئية في الصورة
*Note:* Make sure all petromin foils are visible in the photo`
              );
            } else {
              await sendMessage(
                sender,
                `❌ لم يتم العثور على الميكانيكي
❌ Mechanic not found

يرجى الاتصال بالدعم
Please contact support
care@petrolubegroup.com
+966543652552`
              );
              // Do NOT set session.state = 'menu' or show menu
            }
          } else if (text === "2" || text === "wallet" || text === "balance") {
            const mechanic = await validateMechanicByPhone(sender);
            if (mechanic) {
              const walletData = await fetchMechanicWallet(mechanic.id);
              if (walletData && walletData.data) {
                const balance = walletData.data.balance;
                await sendMessage(
                  sender,
                  `💰 رصيد المحفظة
💰 Wallet Balance

الرصيد الحالي: ${balance} ريال
Current Balance: ${balance} SAR

لبدء الربح، ابدأ بتقديم تغيير زيت
To start earning, begin an oil change submission`,
                  goMenuButton
                );
              } else {
                await sendMessage(
                  sender,
                  `💰 رصيد المحفظة
💰 Wallet Balance

تعذر جلب بيانات المحفظة. يرجى المحاولة مرة أخرى لاحقاً.
Unable to fetch wallet data. Please try again later.`,
                  goMenuButton
                );
              }
              session.state = "menu";
              sessionManager.setSession(sender, session);
              clearInactivityTimer(); // Clear timer when returning to menu
            } else {
              await sendMessage(
                sender,
                `❌ لم يتم العثور على الميكانيكي
❌ Mechanic not found

يرجى الاتصال بالدعم
Please contact support
care@petrolubegroup.com
+966543652552`
              );
              // Do NOT set session.state = 'menu' or show menu
            }
          } else if (
            text === "3" ||
            text === "leaderboard" ||
            text === "rankings"
          ) {
            const mechanic = await validateMechanicByPhone(sender);
            if (mechanic) {
              const leaderboardData = await fetchLeaderboard(mechanic.id);
              if (leaderboardData) {
                const {
                  mechanic: userMechanic,
                  top_mechanics,
                  neighbors,
                } = leaderboardData;
                let leaderboardText = `🏆 لوحة المتصدرين
🏆 Petrolube Leaderboard 🛠️\n\n`;
                leaderboardText += `إحصائياتك:
Your Stats:
👨‍🔧 ترتيبك: ${userMechanic.rank}
Your Rank: ${userMechanic.rank}
🔧 تغييرات الزيت: ${userMechanic.oil_changes}
Oil Changes: ${userMechanic.oil_changes}
💰 المكافآت المكتسبة: ${userMechanic.total_rewards} ريال
Rewards Earned: ${userMechanic.total_rewards} SAR\n\n`;
                leaderboardText += `🔥 أفضل 3 ميكانيكيين
🔥 Top 3 Mechanics:
`;
                top_mechanics.forEach((mech) => {
                  const rankBadge = `[${mech.rank}]`;
                  const displayName =
                    mech.rank === userMechanic.rank
                      ? `*${mech.name} (You)*`
                      : mech.name;
                  const rewards =
                    mech.rank === userMechanic.rank
                      ? ` — ${mech.total_rewards} ريال`
                      : "";
                  leaderboardText += `${rankBadge} ${displayName} — ${mech.oil_changes} تغييرات زيت / oil changes${rewards}\n`;
                });
                leaderboardText += `\n`;
                if (userMechanic.rank > 3) {
                  leaderboardText += `📊 الترتيبات القريبة
📊 Nearby Ranks:
`;
                  neighbors.forEach((mech) => {
                    const rankBadge = `[${mech.rank}]`;
                    const displayName =
                      mech.rank === userMechanic.rank
                        ? `*${mech.name} (You)*`
                        : mech.name;
                    leaderboardText += `${rankBadge} ${displayName} — ${mech.oil_changes} تغييرات زيت / oil changes\n`;
                  });
                  leaderboardText += `\n`;
                }
                if (userMechanic.rank === 1) {
                  leaderboardText += `🏆 أنت البطل! استمر في التميز! 👑
🏆 You're the Champion! Keep dominating!`;
                } else if (userMechanic.rank === 2) {
                  leaderboardText += `🥈 قريب جداً! دفعة واحدة أخرى للوصول للقمة! 💪
🥈 So close! Just one more push to reach the top!`;
                } else if (userMechanic.rank === 3) {
                  leaderboardText += `🥉 عمل رائع! استمر في الدفع للصعود أعلى! 💪
🥉 Great job! Keep pushing to climb higher!`;
                } else {
                  leaderboardText += `استمر في الدفع! 💪 المكان الأول ينتظرك!
Keep pushing! The top spot awaits!`;
                }
                await sendMessage(sender, leaderboardText, goMenuButton);
              } else {
                await sendMessage(
                  sender,
                  `❌ تعذر جلب بيانات المتصدرين
❌ Unable to fetch leaderboard data
يرجى المحاولة مرة أخرى لاحقاً.
Please try again later.`,
                  goMenuButton
                );
              }
              session.state = "menu";
              sessionManager.setSession(sender, session);
              clearInactivityTimer(); // Clear timer when returning to menu
            } else {
              await sendMessage(
                sender,
                `يرجى بدء تقديم تغيير زيت أولاً لعرض المتصدرين
Please start an oil change submission first to view the leaderboard`
              );
              // Do NOT set session.state = 'menu' or show menu
            }
          } else if (text === "4" || text === "help") {
            const mechanic = await validateMechanicByPhone(sender);
            if (mechanic) {
              const helpText = `🆘 المساعدة والتعليمات
🆘 Help & Instructions

كيفية تقديم تغيير زيت:
How to submit an oil change:
1. بدء تقديم تغيير الزيت
1. Start oil change submission
2. إرسال صورة للأغطية الدائرية (رموز QR)
2. Send photo of petromin foils (QR codes)
3. إرسال صورة لوحة السيارة
3. Send photo of car number plate
4. إدخال رقم هاتف العميل
4. Enter customer mobile number
5. انتظار تأكيد العميل
5. Wait for customer confirmation

المتطلبات:
Requirements:
• صورة واضحة للأغطية الدائرية
• Clear photo of circular foils
• صورة واضحة للوحة السيارة
• Clear photo of number plate
• رقم هاتف عميل صحيح
• Valid customer mobile number

المكافآت:
Rewards:
• 4 ريال لكل تغيير زيت مؤكد
• 4 SAR per confirmed oil change
• رصيد فوري في المحفظة بعد موافقة العميل
• Instant wallet credit after customer approval

للدعم الفني: care@petrolubegroup.com
+966543652552
For technical support: care@petrolubegroup.com
+966543652552`;
              await sendMessage(sender, helpText, goMenuButton);
              session.state = "menu";
              sessionManager.setSession(sender, session);
              clearInactivityTimer(); // Clear timer when returning to menu
            } else {
              await sendMessage(
                sender,
                `❌ لم يتم العثور على الميكانيكي
❌ Mechanic not found

يرجى الاتصال بالدعم
Please contact support
care@petrolubegroup.com
+966543652552`
              );
              // Do NOT set session.state = 'menu' or show menu
            }
          } else if (
            text === "menu" ||
            text === "main" ||
            text === "home" ||
            text === "hi"
          ) {
            // Only show menu if mechanic is authenticated
            const mechanic = await validateMechanicByPhone(sender);
            if (mechanic) {
              session.state = "menu";
              sessionManager.setSession(sender, session);
              clearInactivityTimer(); // Clear timer when returning to menu
              await showMainMenu(sender);
            } else {
              await sendMessage(
                sender,
                `❌ لم يتم العثور على الميكانيكي
❌ Mechanic not found

لا يمكنك الوصول إلى القائمة بدون تحقق.
You cannot access the menu without authentication.

يرجى الاتصال بالدعم
Please contact support
care@petrolubegroup.com
+966543652552`
              );
              // Do NOT set session.state = 'menu' or show menu
            }
            return;
          } else if (session.state === "customer_mobile") {
            const { formatSaudiPhoneNumber } = require("../phoneNumberUtils");

            // Format and validate the phone number
            const phoneResult = formatSaudiPhoneNumber(text);

            if (!phoneResult.isValid) {
              await sendMessage(
                sender,
                `❌ ${phoneResult.error}\n❌ رقم هاتف غير صحيح\nيرجى إدخال رقم هاتف صحيح:\nPlease enter a valid phone number:`
              );
              return;
            }

            // Duplication check before proceeding
            const { validateCustomerPhone } = require("../apiService");
            const phoneValidation = await validateCustomerPhone(
              phoneResult.international
            );
            if (!phoneValidation.isValid) {
              await sendMessage(
                sender,
                `❌ رقم الهاتف مكرر أو غير صالح\n❌ Duplicate or invalid customer phone\n${phoneValidation.message}`,
                goMenuButton
              );
              return;
            }

            // Store the formatted international number
            session.data.customerMobile = phoneResult.international;
            session.state = "customer_first_name";
            sessionManager.setSession(sender, session);

            // Show confirmation of the formatted number
            await sendMessage(
              sender,
              `👤 يرجى إدخال الاسم الأول للعميل:\n👤 Please enter the customer's first name:`
            );
          } else if (session.state === "customer_first_name") {
            const customerFirstName = message.text.body.trim();
            session.data.customerFirstName = customerFirstName;
            session.state = "customer_middle_name";
            sessionManager.setSession(sender, session);

            await sendMessage(
              sender,
              `👤 يرجى إدخال الاسم الأوسط للعميل (اختياري - اكتب "لا" إذا لم يكن موجود):\n👤 Please enter the customer's middle name (optional - type "no" if not applicable):`
            );
          } else if (session.state === "customer_middle_name") {
            const customerMiddleName = message.text.body.trim();
            session.data.customerMiddleName =
              customerMiddleName === "لا" ||
              customerMiddleName.toLowerCase() === "no"
                ? ""
                : customerMiddleName;
            session.state = "customer_last_name";
            sessionManager.setSession(sender, session);

            await sendMessage(
              sender,
              `👤 يرجى إدخال اسم العائلة للعميل:\n👤 Please enter the customer's last name:`
            );
          } else if (session.state === "customer_last_name") {
            const customerLastName = message.text.body.trim();
            session.data.customerLastName = customerLastName;

            // Combine the names for display
            const fullName = [
              session.data.customerFirstName,
              session.data.customerMiddleName,
              session.data.customerLastName,
            ]
              .filter((name) => name && name.trim())
              .join(" ");

            session.data.customerName = fullName;
            sessionManager.setSession(sender, session);

            const validation = await validateCustomer(
              session.data.customerMobile,
              session.data.plateNumber
            );
            try {
              // Ensure customer phone is in international format
              const { formatSaudiPhoneNumber } = require("../phoneNumberUtils");
              const phoneResult = formatSaudiPhoneNumber(
                session.data.customerMobile
              );

              const apiBody = {
                customer_first_name: session.data.customerFirstName,
                customer_middle_name: session.data.customerMiddleName,
                customer_last_name: session.data.customerLastName,
                customer_phone: phoneResult.international,
                car_plate_number: session.data.plateNumber,
                qr_codes: session.data.qrCodes,
                number_of_foils: session.data.foilCount || 0,
                qr_codes_missing: session.data.qrCodesMissing || false,
              };
              // Replace with your actual baseUrl if different
              const apiResponse = await axios.post(
                `${process.env.EXTERNAL_API_BASE_URL}/bot/mechanics/${session.data.mechanicId}/oil-change`,
                apiBody,
                {
                  headers: {
                    "X-Petrolube-Secret-Key": process.env.PETROLUBE_SECRET_KEY,
                  },
                }
              );
              if (apiResponse.status >= 200 && apiResponse.status < 300) {
                const submissionId = apiResponse.data.data.submission_id;
                const logId = `${session.data.mechanicId}_${Date.now()}`;
                sessionManager.addOilChangeLog(logId, {
                  mechanicId: session.data.mechanicId,
                  customerMobile: phoneResult.international,
                  plateNumber: session.data.plateNumber,
                  qrCodes: session.data.qrCodes,
                  timestamp: new Date().toISOString(),
                  status: "pending_confirmation",
                  submissionId: submissionId,
                });
                // Do NOT update wallet or send reward message here
                await sendMessage(
                  sender,
                  `✅ تم تقديم الطلب بنجاح!\n\nيرجى انتظار موافقة العميل. سيتم إضافة المكافأة إلى محفظتك بعد تأكيد العميل.\n\n---\n\n✅ Submission successful!\n\nPlease wait for customer approval. Your reward will be added to your wallet after customer confirmation.`,
                  goMenuButton
                );
                // Ensure customer phone is in international format for WhatsApp
                const {
                  formatSaudiPhoneNumber,
                } = require("../phoneNumberUtils");
                const whatsappPhoneResult = formatSaudiPhoneNumber(
                  session.data.customerMobile
                );

                await sendTemplateMessageByName(
                  whatsappPhoneResult.international,
                  "customer_approval",
                  [session.data.customerName, session.data.plateNumber]
                );
                sessionManager.setCustomerToLog(
                  phoneResult.international,
                  logId
                );
                console.log("📝 Added customer to log:", {
                  customerMobile: phoneResult.international,
                  logId: logId,
                  submissionId: submissionId,
                });
                console.log(
                  "📊 Current oil change logs:",
                  sessionManager.getOilChangeLogs()
                );
                session.data.logId = logId;
                session.data.submissionId = submissionId;
                session.data.customerMobile = phoneResult.international; // Update session with international format
                session.state = "menu";
                sessionManager.setSession(sender, session);
                clearInactivityTimer(); // Clear timer after successful submission
              } else {
                const errorMsg =
                  apiResponse.data && apiResponse.data.message
                    ? apiResponse.data.message
                    : "❌ فشل في تقديم تغيير الزيت. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.\n\n---\n\n❌ Oil change submission failed. Please try again or contact support.";
                await sendMessage(sender, errorMsg, goMenuButton);
                session.state = "menu";
                sessionManager.setSession(sender, session);
                clearInactivityTimer(); // Clear timer after error
              }
            } catch (apiError) {
              let errorMsg =
                "❌ فشل في تقديم تغيير الزيت. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.\n\n---\n\n❌ Oil change submission failed. Please try again or contact support.";
              if (
                apiError.response &&
                apiError.response.data &&
                apiError.response.data.message
              ) {
                errorMsg = apiError.response.data.message;
              } else if (apiError.message) {
                errorMsg = apiError.message;
              }
              await sendMessage(sender, errorMsg, goMenuButton);
              session.state = "menu";
              sessionManager.setSession(sender, session);
              clearInactivityTimer(); // Clear timer after error
            }
          }
        } else if (message.type === "image") {
          const imageBuffer = await downloadImage(message.image.id);
          if (session.state === "qr_codes") {
            const foilCount = await detectNumberOfFoils(imageBuffer);
            if (foilCount < 3) {
              await sendMessage(
                sender,
                `❌ يجب أن تكون هناك 4 أغطية دائرية على الأقل في الصورة
❌ At least 4 foils must be visible in the image.

الأغطية المكتشفة: ${foilCount}
Detected foils: ${foilCount}

يرجى إعادة التقاط الصورة والتأكد من أن هناك 4 أغطية دائرية على الأقل مرئية بوضوح
Please retake the photo and ensure at least 4 foils are clearly visible.`
              );
              return;
            }
            const qrResult = await scanQRCodes(imageBuffer);
            const qrCodes = qrResult.qr_codes || [];
            let qrOk = false;
            let qrCodesMissing = false;
            if (foilCount === 0) {
              qrOk = true;
            } else if (qrCodes.length >= foilCount) {
              qrOk = true;
            } else if (qrCodes.length >= Math.ceil(0.75 * foilCount)) {
              qrOk = true;
            } else {
              qrOk = false;
            }
            if (qrCodes.length < Math.ceil(0.75 * foilCount)) {
              qrCodesMissing = true;
            }
            if (!qrOk) {
              await sendMessage(
                sender,
                `❌ لم يتم اكتشاف رموز QR كافية لعدد الأغطية.
❌ Not enough QR codes detected for the number of foils.

الأغطية المكتشفة: ${foilCount}
Detected foils: ${foilCount}
رموز QR المكتشفة: ${qrCodes.length}
Detected QR codes: ${qrCodes.length}

يرجى إعادة التقاط الصورة والتأكد من أن جميع رموز QR مرئية على الأغطية الدائرية
Please retake the photo and ensure all QR codes are visible on the foils.`
              );
              return;
            }
            if (qrCodes.length > 0) {
              const qrValidation = await validateQRCodes(qrCodes);
              if (!qrValidation.isValid) {
                await sendMessage(
                  sender,
                  `❌ ${qrValidation.message}\n\nيرجى إعادة إرسال صورة الأغطية الدائرية (رموز QR) بدون تكرار.\nPlease resubmit the photo of the petromin foils (QR codes) without duplicates.`,
                  goMenuButton
                );
                // Do NOT change state, stay in 'qr_codes'
                return;
              }
              session.data.qrCodes = qrCodes;
              session.data.foilCount = foilCount;
              session.data.qrCodesMissing = qrCodesMissing;
              session.state = "number_plate";
              sessionManager.setSession(sender, session);
              let responseText = `📸 تم مسح رموز QR
📸 QR Codes Scanned

الأغطية الدائرية المكتشفة: ${foilCount}
Detected Foils: ${foilCount}
تم العثور على ${qrCodes.length} رموز QR:
Found ${qrCodes.length} QR codes:
`;
              qrCodes.forEach((code, index) => {
                responseText += `${index + 1}. ${code}\n`;
              });
              responseText += `\n${qrValidation.message}\n\n📸 الآن يرجى إرسال صورة لوحة السيارة
📸 Now please send a photo of the car's number plate`;
              await sendMessage(sender, responseText, goMenuButton);
            } else {
              await sendMessage(
                sender,
                `❌ لم يتم اكتشاف رموز QR
❌ No QR codes detected

يرجى التأكد من أن جميع الأغطية الدائرية مرئية بوضوح والمحاولة مرة أخرى
Please ensure all petromin foils are clearly visible and try again`,
                goMenuButton
              );
            }
          } else if (session.state === "number_plate") {
            const plateNumber = await extractNumberPlate(imageBuffer);
            if (plateNumber) {
              // Duplication check before proceeding
              const { validateCarPlate } = require("../apiService");
              const plateValidation = await validateCarPlate(plateNumber);
              if (!plateValidation.isValid) {
                await sendMessage(
                  sender,
                  `❌ رقم اللوحة مكرر أو غير صالح\n❌ Duplicate or invalid plate number\n${plateValidation.message}`,
                  goMenuButton
                );
                return;
              }
              session.data.plateNumber = plateNumber;
              session.state = "customer_mobile";
              sessionManager.setSession(sender, session);
              await sendMessage(
                sender,
                `🚗 تم اكتشاف لوحة السيارة
🚗 Number Plate Detected

رقم اللوحة: ${plateNumber}
Plate Number: ${plateNumber}

📱 يرجى إدخال رقم هاتف العميل:
📱 Please enter the customer's mobile number:`,
                goMenuButton
              );
            } else {
              await sendMessage(
                sender,
                `❌ لم يتم اكتشاف لوحة السيارة
❌ Could not detect the number plate

يرجى التأكد من أن اللوحة مرئية بوضوح والمحاولة مرة أخرى
Please ensure the plate is clearly visible and try again`,
                goMenuButton
              );
            }
          } else {
            await sendMessage(
              sender,
              `يرجى اتباع عملية التقديم
Please follow the submission process

اكتب 'menu' للبدء من جديد
Type 'menu' to start over`,
              goMenuButton
            );
            session.state = "menu";
            sessionManager.setSession(sender, session);
            clearInactivityTimer(); // Clear timer when returning to menu
          }
        } else if (message.type === "button") {
          console.log("🔍 Button message received:", {
            messageType: message.type,
            buttonPayload: message.button?.payload,
            buttonText: message.button?.text,
            fullMessage: JSON.stringify(message, null, 2),
          });

          const buttonId = message.button?.payload;
          const customerMobile = sender;

          console.log("🔍 Button pressed:", {
            buttonId: buttonId,
            customerMobile: customerMobile,
            messageType: message.type,
          });

          if (buttonId === "YES") {
            console.log("✅ Customer confirmed - looking for pending log...");

            // First check if customer has already made a decision
            const existingLog = sessionManager
              .getOilChangeLogs()
              .find((log) => log.customerMobile === customerMobile);

            if (
              existingLog &&
              (existingLog.status === "confirmed" ||
                existingLog.status === "disputed")
            ) {
              console.log(
                "⚠️ Customer already made a decision:",
                existingLog.status
              );
              await sendMessage(
                customerMobile,
                `⚠️ *لا يمكن تغيير القرار*\n\nلقد قمت بالفعل بـ ${
                  existingLog.status === "confirmed" ? "تأكيد" : "رفض"
                } تغيير الزيت.\n\nلا يمكن تغيير القرار بعد إرساله.\n\nللمساعدة: care@petrolubegroup.com\n+966543652552\n\n---\n\n⚠️ *Decision Already Made*\n\nYou have already ${
                  existingLog.status === "confirmed" ? "confirmed" : "disputed"
                } this oil change.\n\nYour decision cannot be changed.\n\nFor assistance: care@petrolubegroup.com\n+966543652552`
              );
              return;
            }

            const pendingLog = sessionManager
              .getOilChangeLogs()
              .find(
                (log) =>
                  log.customerMobile === customerMobile &&
                  log.status === "pending_confirmation"
              );
            console.log(
              "🔍 Found pending log:",
              pendingLog
                ? {
                    submissionId: pendingLog.submissionId,
                    mechanicId: pendingLog.mechanicId,
                    customerMobile: pendingLog.customerMobile,
                    status: pendingLog.status,
                  }
                : "No pending log found"
            );

            if (pendingLog && pendingLog.submissionId) {
              try {
                console.log(
                  "🚀 Calling status update API for submission:",
                  pendingLog.submissionId
                );
                // Call the new API endpoint to update status to confirmed
                const statusResponse = await axios.patch(
                  `${process.env.EXTERNAL_API_BASE_URL}/bot/oil-change-status/${pendingLog.submissionId}`,
                  { status: "confirmed" },
                  {
                    headers: {
                      "X-Petrolube-Secret-Key":
                        process.env.PETROLUBE_SECRET_KEY,
                    },
                  }
                );

                if (
                  statusResponse.status >= 200 &&
                  statusResponse.status < 300
                ) {
                  console.log(
                    "✅ Status update API successful:",
                    statusResponse.data
                  );
                  const responseData = statusResponse.data.data;
                  pendingLog.status = "confirmed";
                  pendingLog.confirmedAt = new Date().toISOString();

                  // Send reward message to mechanic using phone number from API response
                  const mechanicPhoneNumber =
                    responseData.mechanic.mobile_number;
                  console.log(
                    "📱 Sending reward message to mechanic:",
                    mechanicPhoneNumber
                  );

                  // Get car plate number from pending log
                  const carPlateNumber = pendingLog.plateNumber || "N/A";

                  await sendMessage(
                    mechanicPhoneNumber,
                    `💰 *تم الحصول على المكافأة!*\n\nتم تأكيد تغيير الزيت من قبل العميل\n\n🚗 رقم اللوحة: ${carPlateNumber}\nCar Plate: ${carPlateNumber}\n\n✅ تم إضافة 4 ريال إلى محفظتك\n\nلفحص رصيد المحفظة، اكتب "2" أو "wallet"\n\n---\n\n💰 *Reward Earned!*\n\nOil change confirmed by customer.\n\n🚗 Car Plate: ${carPlateNumber}\n\n✅ +4 SAR added to your wallet\n\nTo check wallet balance, type "2" or "wallet"`,
                    goMenuButton
                  );

                  // Send confirmation message to customer with spin URL (handle null case)
                  const spinUrl = responseData.spin_url;
                  console.log(
                    "📱 Sending confirmation message to customer:",
                    customerMobile
                  );

                  let customerMessage;
                  if (spinUrl) {
                    customerMessage = `✅ *تم تأكيد تغيير الزيت!*\n\nشكراً لك على التأكيد!\n\n🎰 انقر هنا لتدوير عجلة المكافآت:\n${spinUrl}\n\n---\n\n✅ *Oil Change Confirmed!*\n\nThank you for confirming!\n\n🎉 Your chance to win! 🎉\n 🎰 Tap below to spin the Reward Wheel & unlock your surprise!:\n${spinUrl}`;
                  } else {
                    customerMessage = `✅ *تم تأكيد تغيير الزيت!*\n\nشكراً لك على التأكيد!\n\nسيتم إرسال رابط عجلة المكافآت قريباً.\n\n---\n\n✅ *Oil Change Confirmed!*\n\nThank you for confirming!\n\nThe reward wheel link will be sent shortly.`;
                  }

                  await sendMessage(customerMobile, customerMessage);
                  console.log("✅ All messages sent successfully");
                }
              } catch (error) {
                console.error("❌ Error updating oil change status:", error);
                console.error("❌ Error details:", {
                  message: error.message,
                  response: error.response?.data,
                  status: error.response?.status,
                });
                await sendMessage(
                  customerMobile,
                  `❌ حدث خطأ أثناء تأكيد تغيير الزيت. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.\n\n---\n\n❌ Error occurred while confirming oil change. Please try again or contact support.`
                );
              }
            } else {
              console.log(
                "⚠️ No pending log found for customer confirmation:",
                customerMobile
              );
              console.log(
                "📊 All current oil change logs:",
                sessionManager.getOilChangeLogs()
              );
            }
          } else if (buttonId === "NO") {
            console.log("❌ Customer disputed - looking for pending log...");

            // First check if customer has already made a decision
            const existingLog = sessionManager
              .getOilChangeLogs()
              .find((log) => log.customerMobile === customerMobile);

            if (
              existingLog &&
              (existingLog.status === "confirmed" ||
                existingLog.status === "disputed")
            ) {
              console.log(
                "⚠️ Customer already made a decision:",
                existingLog.status
              );
              await sendMessage(
                customerMobile,
                `⚠️ *لا يمكن تغيير القرار*\n\nلقد قمت بالفعل بـ ${
                  existingLog.status === "confirmed" ? "تأكيد" : "رفض"
                } تغيير الزيت.\n\nلا يمكن تغيير القرار بعد إرساله.\n\nللمساعدة: care@petrolubegroup.com\n+966543652552\n\n---\n\n⚠️ *Decision Already Made*\n\nYou have already ${
                  existingLog.status === "confirmed" ? "confirmed" : "disputed"
                } this oil change.\n\nYour decision cannot be changed.\n\nFor assistance: care@petrolubegroup.com\n+966543652552`
              );
              return;
            }

            const pendingLog = sessionManager
              .getOilChangeLogs()
              .find(
                (log) =>
                  log.customerMobile === customerMobile &&
                  log.status === "pending_confirmation"
              );
            console.log(
              "🔍 Found pending log for dispute:",
              pendingLog
                ? {
                    submissionId: pendingLog.submissionId,
                    mechanicId: pendingLog.mechanicId,
                    customerMobile: pendingLog.customerMobile,
                    status: pendingLog.status,
                  }
                : "No pending log found"
            );

            if (pendingLog && pendingLog.submissionId) {
              try {
                console.log(
                  "🚀 Calling status update API for dispute, submission:",
                  pendingLog.submissionId
                );
                // Call the new API endpoint to update status to disputed
                const statusResponse = await axios.patch(
                  `${process.env.EXTERNAL_API_BASE_URL}/bot/oil-change-status/${pendingLog.submissionId}`,
                  { status: "disputed" },
                  {
                    headers: {
                      "X-Petrolube-Secret-Key":
                        process.env.PETROLUBE_SECRET_KEY,
                    },
                  }
                );

                if (
                  statusResponse.status >= 200 &&
                  statusResponse.status < 300
                ) {
                  console.log(
                    "✅ Dispute status update API successful:",
                    statusResponse.data
                  );
                  const responseData = statusResponse.data.data;
                  pendingLog.status = "disputed";
                  pendingLog.disputedAt = new Date().toISOString();

                  // Send dispute message to customer
                  console.log(
                    "📱 Sending dispute message to customer:",
                    customerMobile
                  );
                  await sendMessage(
                    customerMobile,
                    `❌ *تم تقديم النزاع*\n\nتم تسجيل نزاع تغيير الزيت الخاص بك\n\nسيتصل بك فريقنا خلال 24 ساعة لحل هذه المشكلة\n\n---\n\n❌ *Dispute Filed*\n\nYour oil change dispute has been recorded\n\nOur team will contact you within 24 hours to resolve this issue.`
                  );

                  // Send notification to mechanic about dispute using phone number from API response
                  const mechanicPhoneNumber =
                    responseData.mechanic.mobile_number;
                  console.log(
                    "📱 Sending dispute notification to mechanic:",
                    mechanicPhoneNumber
                  );

                  // Get car plate number from pending log
                  const carPlateNumber = pendingLog.plateNumber || "N/A";

                  await sendMessage(
                    mechanicPhoneNumber,
                    `❌ *تم تقديم نزاع من العميل*\n\nتم تقديم نزاع على تغيير الزيت من قبل العميل\n\n🚗 رقم اللوحة: ${carPlateNumber}\nCar Plate: ${carPlateNumber}\n\nيرجى الاتصال بدعم العملاء:\ncare@petrolubegroup.com\n+966543652552\n\n---\n\n❌ *Customer Dispute Filed*\n\nA dispute has been filed by the customer for this oil change\n\n🚗 Car Plate: ${carPlateNumber}\n\nPlease contact customer support:\ncare@petrolubegroup.com\n+966543652552`
                  );
                  console.log("✅ All dispute messages sent successfully");
                }
              } catch (error) {
                console.error(
                  "❌ Error updating oil change status for dispute:",
                  error
                );
                console.error("❌ Error details:", {
                  message: error.message,
                  response: error.response?.data,
                  status: error.response?.status,
                });
                await sendMessage(
                  customerMobile,
                  `❌ حدث خطأ أثناء تقديم النزاع. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.\n\n---\n\n❌ Error occurred while filing dispute. Please try again or contact support.`
                );
              }
            } else {
              console.log(
                "⚠️ No pending log found for customer:",
                customerMobile
              );
              console.log(
                "📊 All current oil change logs:",
                sessionManager.getOilChangeLogs()
              );
              await sendMessage(
                customerMobile,
                `❌ *تم تقديم النزاع*\n\nتم تسجيل نزاع تغيير الزيت الخاص بك\n\nسيتصل بك فريقنا خلال 24 ساعة لحل هذه المشكلة\n\nللمساعدة الفورية: care@petrolubegroup.com\n+966543652552\n\n---\n\n❌ *Dispute Filed*\n\nYour oil change dispute has been recorded\n\nOur team will contact you within 24 hours to resolve this issue\n\nFor immediate assistance: care@petrolubegroup.com\n+966543652552`
              );
            }
          } else if (buttonId === "go_menu") {
            session.state = "menu";
            sessionManager.setSession(sender, session);
            clearInactivityTimer(); // Clear timer when returning to menu
            await showMainMenu(sender);
            return;
          }
        } else if (
          message.type === "interactive" &&
          message.interactive?.type === "button_reply"
        ) {
          console.log("🔍 Interactive button message received:", {
            messageType: message.type,
            interactiveType: message.interactive?.type,
            buttonId: message.interactive?.button_reply?.id,
            buttonTitle: message.interactive?.button_reply?.title,
            fullMessage: JSON.stringify(message, null, 2),
          });

          const buttonId = message.interactive?.button_reply?.id;
          const customerMobile = sender;

          console.log("🔍 Interactive button pressed:", {
            buttonId: buttonId,
            customerMobile: customerMobile,
            messageType: message.type,
          });

          if (buttonId === "go_menu") {
            session.state = "menu";
            sessionManager.setSession(sender, session);
            clearInactivityTimer(); // Clear timer when returning to menu
            await showMainMenu(sender);
            return;
          }
        } else {
          console.log(
            "⚠️ Unhandled message type:",
            message.type,
            "from:",
            sender
          );
          console.log(
            "⚠️ Full message structure:",
            JSON.stringify(message, null, 2)
          );
        }
      } catch (error) {
        console.error("Error in webhook handler (async):", error);
      }
    });
  } catch (error) {
    console.error("Error in webhook handler (sync):", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
