const express = require('express');
const router = express.Router();
const { sendMessage, downloadImage, sendTemplateMessage } = require('../whatsappService');
const { extractNumberPlate, detectNumberOfFoils } = require('../openaiService');
const sessionManager = require('../sessionManager');
const { validateMechanicByPhone, validateQRCodes, validateCustomer, updateMechanicWallet, fetchLeaderboard, fetchMechanicWallet, WHATSAPP_API_URL, API_TOKEN, PHONE_NUMBER_ID, OPENAI_API_KEY, PYTHON_QR_API_URL, EXTERNAL_API_BASE_URL } = require('../apiService');
const { showMainMenu } = require('../menuService');

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// Add this near the top, after your imports
const goMenuButton = [
  {
    type: 'reply',
    reply: {
      id: 'go_menu',
      title: 'القائمة | Menu'
    }
  }
];

// Webhook verification
router.get('/webhook', (req, res) => {
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

// Utility: scanQRCodes using Python API
const axios = require('axios');
const FormData = require('form-data');
async function scanQRCodes(imageBuffer) {
    try {
        const form = new FormData();
        form.append('file', imageBuffer, { filename: 'image.jpg' });
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
            summary: { successfully_decoded: 0, total_qr_codes_found: 0 }
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
router.post('/webhook', (req, res) => {
    try {
        if (!req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
            return res.status(200).send('OK');
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
                let session = sessionManager.getSession(sender);
                const resetInactivityTimer = () => {
                    sessionManager.clearInactivityTimer(sender);
                    if (session.state !== 'menu') {
                        sessionManager.setInactivityTimer(sender, async () => {
                            await sendMessage(sender, inactivityReminderText, goMenuButton);
                        }, INACTIVITY_REMINDER_MS);
                    }
                };
                resetInactivityTimer();

                if (message.type === 'text') {
                    const text = message.text.body.toLowerCase().trim();
                    // Handle menu navigation
                    if (text === '1' || text === 'start' || text === 'oil change') {
                        const mechanic = await validateMechanicByPhone(sender);
                        if (mechanic) {
                            session.data.mechanicId = mechanic.id;
                            session.data.mechanicName = mechanic.name;
                            session.data.mechanicNameAr = mechanic.nameAr;
                            session.state = 'qr_codes';
                            sessionManager.setSession(sender, session);
                            await sendMessage(sender, `✅ تم التحقق من الميكانيكي: ${mechanic.nameAr}
✅ Mechanic verified: ${mechanic.name}

📸 يرجى إرسال صورة للأغطية الدائرية (رموز QR)
📸 Please send a photo of the circular foils (QR codes)

*ملاحظة:* تأكد من أن جميع الأغطية الدائرية مرئية في الصورة
*Note:* Make sure all circular foils are visible in the photo`);
                        } else {
                            await sendMessage(sender, `❌ لم يتم العثور على الميكانيكي
❌ Mechanic not found

يرجى الاتصال بالدعم
Please contact support
+966501234567`);
                            session.state = 'menu';
                            sessionManager.setSession(sender, session);
                        }
                    } else if (text === '2' || text === 'wallet' || text === 'balance') {
                        const mechanic = await validateMechanicByPhone(sender);
                        if (mechanic) {
                            const walletData = await fetchMechanicWallet(mechanic.id);
                            if (walletData && walletData.data) {
                                const balance = walletData.data.balance;
                                await sendMessage(sender, `💰 رصيد المحفظة
💰 Wallet Balance

الرصيد الحالي: ${balance} ريال
Current Balance: ${balance} SAR

لبدء الربح، ابدأ بتقديم تغيير زيت
To start earning, begin an oil change submission`);
                            } else {
                                await sendMessage(sender, `💰 رصيد المحفظة
💰 Wallet Balance

تعذر جلب بيانات المحفظة. يرجى المحاولة مرة أخرى لاحقاً.
Unable to fetch wallet data. Please try again later.`);
                            }
                        } else {
                            await sendMessage(sender, `❌ لم يتم العثور على الميكانيكي
❌ Mechanic not found

يرجى الاتصال بالدعم
Please contact support
+966501234567`);
                        }
                        session.state = 'menu';
                        sessionManager.setSession(sender, session);
                    } else if (text === '3' || text === 'leaderboard' || text === 'rankings') {
                        const mechanic = await validateMechanicByPhone(sender);
                        if (mechanic) {
                            const leaderboardData = await fetchLeaderboard(mechanic.id);
                            if (leaderboardData) {
                                const { mechanic: userMechanic, top_mechanics, neighbors } = leaderboardData;
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
                                top_mechanics.forEach(mech => {
                                    const rankBadge = `[${mech.rank}]`;
                                    const rewards = mech.total_rewards ? `(${mech.total_rewards} SAR)` : '';
                                    const displayName = mech.rank === userMechanic.rank ? `*${mech.name} (You)*` : mech.name;
                                    leaderboardText += `${rankBadge} ${displayName} — ${mech.oil_changes} تغييرات زيت / oil changes ${rewards}\n`;
                                });
                                leaderboardText += `\n`;
                                if (userMechanic.rank > 3) {
                                    leaderboardText += `📊 الترتيبات القريبة
📊 Nearby Ranks:
`;
                                    neighbors.forEach(mech => {
                                        const rankBadge = `[${mech.rank}]`;
                                        const displayName = mech.rank === userMechanic.rank ? `*${mech.name} (You)*` : mech.name;
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
                                await sendMessage(sender, leaderboardText);
                            } else {
                                await sendMessage(sender, `❌ تعذر جلب بيانات المتصدرين
❌ Unable to fetch leaderboard data
يرجى المحاولة مرة أخرى لاحقاً.
Please try again later.`);
                            }
                        } else {
                            await sendMessage(sender, `يرجى بدء تقديم تغيير زيت أولاً لعرض المتصدرين
Please start an oil change submission first to view the leaderboard`);
                        }
                        session.state = 'menu';
                        sessionManager.setSession(sender, session);
                    } else if (text === '4' || text === 'help') {
                        const helpText = `🆘 المساعدة والتعليمات
🆘 Help & Instructions

كيفية تقديم تغيير زيت:
How to submit an oil change:
1. بدء تقديم تغيير الزيت
1. Start oil change submission
2. إرسال صورة للأغطية الدائرية (رموز QR)
2. Send photo of circular foils (QR codes)
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

للدعم الفني: support@example.com
For technical support: support@example.com`;
                        await sendMessage(sender, helpText, goMenuButton);
                        session.state = 'menu';
                        sessionManager.setSession(sender, session);
                    } else if (text === 'menu' || text === 'main' || text === 'home') {
                        session.state = 'menu';
                        sessionManager.setSession(sender, session);
                        await showMainMenu(sender);
                    } else if (session.state === 'customer_mobile') {
                        const mobileNumber = text.replace(/\D/g, '');
                        if (mobileNumber.length >= 10) {
                            session.data.customerMobile = mobileNumber;
                            session.state = 'customer_name';
                            sessionManager.setSession(sender, session);
                            await sendMessage(sender, `👤 يرجى إدخال اسم العميل:
👤 Please enter the customer's name:`);
                        } else {
                            await sendMessage(sender, `❌ رقم هاتف غير صحيح
❌ Invalid mobile number
يرجى إدخال رقم هاتف صحيح:
Please enter a valid mobile number:`);
                        }
                    } else if (session.state === 'customer_name') {
                        const customerName = message.text.body.trim();
                        session.data.customerName = customerName;
                        sessionManager.setSession(sender, session);
                        const validation = await validateCustomer(session.data.customerMobile, session.data.plateNumber);
                        try {
                            const apiBody = {
                                customer_name: session.data.customerName,
                                customer_phone: session.data.customerMobile,
                                car_plate_number: session.data.plateNumber,
                                qr_codes: session.data.qrCodes,
                                number_of_foils: session.data.foilCount || 0,
                                qr_codes_missing: session.data.qrCodesMissing || false
                            };
                            // Replace with your actual baseUrl if different
                            const apiResponse = await axios.post(
                                `${process.env.EXTERNAL_API_BASE_URL}/bot/mechanics/${session.data.mechanicId}/oil-change`,
                                apiBody,
                                {
                                    headers: {
                                        'X-Petrolube-Secret-Key': process.env.PETROLUBE_SECRET_KEY
                                    }
                                }
                            );
                            if (apiResponse.status >= 200 && apiResponse.status < 300) {
                                const logId = `${session.data.mechanicId}_${Date.now()}`;
                                sessionManager.addOilChangeLog(logId, {
                                    mechanicId: session.data.mechanicId,
                                    customerMobile: session.data.customerMobile,
                                    plateNumber: session.data.plateNumber,
                                    qrCodes: session.data.qrCodes,
                                    timestamp: new Date().toISOString(),
                                    status: 'pending_confirmation'
                                });
                                const newBalance = sessionManager.getWallet(session.data.mechanicId) + 4;
                                sessionManager.setWallet(session.data.mechanicId, newBalance);
                                await sendMessage(sender, `💰 *تم الحصول على المكافأة!*\n\nتم تقديم تغيير الزيت\n\n✅ تم إضافة 4 ريال إلى محفظتك\n💰 الرصيد الجديد: ${newBalance} ريال\n\nاستمر في العمل الجيد!\n\n---\n\n💰 *Reward Earned!*\n\nOil change submitted.\n\n✅ +4 SAR added to your wallet\n💰 New Balance: ${newBalance} SAR\n\nKeep up the great work!`);
                                await sendTemplateMessage(session.data.customerMobile, session.data.customerName, session.data.plateNumber);
                                sessionManager.setCustomerToLog(session.data.customerMobile, logId);
                                const spinLink = generateSpinWheelLink(session.data.customerMobile, logId);
                                await sendMessage(
                                    session.data.customerMobile,
                                    `🎰 *قم بتدوير عجلة المكافآت!*\n\nشكراً لك على تغيير الزيت!\n\nانقر أدناه للدوران والفوز بالجوائز:\n${spinLink}\n\n---\n\n🎰 *Spin the Reward Wheel!*\n\nThank you for your oil change!\n\nClick below to spin and win prizes:\n${spinLink}`,
                                    [
                                        {
                                            type: 'reply',
                                            reply: {
                                                id: 'dispute',
                                                title: 'نزاع'
                                            }
                                        }
                                    ]
                                );
                                session.data.logId = logId;
                                session.state = 'waiting_confirmation';
                            } else {
                                const errorMsg = (apiResponse.data && apiResponse.data.message) ? apiResponse.data.message : '❌ فشل في تقديم تغيير الزيت. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.\n\n---\n\n❌ Oil change submission failed. Please try again or contact support.';
                                await sendMessage(sender, errorMsg, goMenuButton);
                                session.state = 'menu';
                                sessionManager.setSession(sender, session);
                            }
                        } catch (apiError) {
                            let errorMsg = '❌ فشل في تقديم تغيير الزيت. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.\n\n---\n\n❌ Oil change submission failed. Please try again or contact support.';
                            if (apiError.response && apiError.response.data && apiError.response.data.message) {
                                errorMsg = apiError.response.data.message;
                            } else if (apiError.message) {
                                errorMsg = apiError.message;
                            }
                            await sendMessage(sender, errorMsg, goMenuButton);
                            session.state = 'menu';
                            sessionManager.setSession(sender, session);
                        }
                    }
                } else if (message.type === 'image') {
                    const imageBuffer = await downloadImage(message.image.id);
                    if (session.state === 'qr_codes') {
                        const foilCount = await detectNumberOfFoils(imageBuffer);
                        if (foilCount < 3) {
                            await sendMessage(sender, `❌ يجب أن تكون هناك 4 أغطية دائرية على الأقل في الصورة
❌ At least 4 foils must be visible in the image.

الأغطية المكتشفة: ${foilCount}
Detected foils: ${foilCount}

يرجى إعادة التقاط الصورة والتأكد من أن هناك 4 أغطية دائرية على الأقل مرئية بوضوح
Please retake the photo and ensure at least 4 foils are clearly visible.`);
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
                            await sendMessage(sender, `❌ لم يتم اكتشاف رموز QR كافية لعدد الأغطية.
❌ Not enough QR codes detected for the number of foils.

الأغطية المكتشفة: ${foilCount}
Detected foils: ${foilCount}
رموز QR المكتشفة: ${qrCodes.length}
Detected QR codes: ${qrCodes.length}

يرجى إعادة التقاط الصورة والتأكد من أن جميع رموز QR مرئية على الأغطية الدائرية
Please retake the photo and ensure all QR codes are visible on the foils.`);
                            return;
                        }
                        if (qrCodes.length > 0) {
                            const qrValidation = await validateQRCodes(qrCodes);
                            session.data.qrCodes = qrCodes;
                            session.data.foilCount = foilCount;
                            session.data.qrCodesMissing = qrCodesMissing;
                            session.state = 'number_plate';
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
                            await sendMessage(sender, `❌ لم يتم اكتشاف رموز QR
❌ No QR codes detected

يرجى التأكد من أن جميع الأغطية الدائرية مرئية بوضوح والمحاولة مرة أخرى
Please ensure all circular foils are clearly visible and try again`, goMenuButton);
                        }
                    } else if (session.state === 'number_plate') {
                        const plateNumber = await extractNumberPlate(imageBuffer);
                        if (plateNumber) {
                            session.data.plateNumber = plateNumber;
                            session.state = 'customer_mobile';
                            sessionManager.setSession(sender, session);
                            await sendMessage(sender, `🚗 تم اكتشاف لوحة السيارة
🚗 Number Plate Detected

رقم اللوحة: ${plateNumber}
Plate Number: ${plateNumber}

📱 يرجى إدخال رقم هاتف العميل:
📱 Please enter the customer's mobile number:`, goMenuButton);
                        } else {
                            await sendMessage(sender, `❌ لم يتم اكتشاف لوحة السيارة
❌ Could not detect the number plate

يرجى التأكد من أن اللوحة مرئية بوضوح والمحاولة مرة أخرى
Please ensure the plate is clearly visible and try again`, goMenuButton);
                        }
                    } else {
                        await sendMessage(sender, `يرجى اتباع عملية التقديم
Please follow the submission process

اكتب 'menu' للبدء من جديد
Type 'menu' to start over`, goMenuButton);
                        session.state = 'menu';
                        sessionManager.setSession(sender, session);
                    }
                } else if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
                    const buttonId = message.interactive.button_reply.id;
                    const customerMobile = sender;
                    if (buttonId === 'confirm') {
                        const pendingLog = sessionManager.getOilChangeLogs().find(log => log.customerMobile === customerMobile && log.status === 'pending_confirmation');
                        if (pendingLog) {
                            pendingLog.status = 'confirmed';
                            pendingLog.confirmedAt = new Date().toISOString();
                            const newBalance = sessionManager.getWallet(pendingLog.mechanicId) + 4;
                            sessionManager.setWallet(pendingLog.mechanicId, newBalance);
                            await sendMessage(customerMobile, `✅ *تم تأكيد تغيير الزيت!*\n\nشكراً لك على تأكيد تغيير الزيت\n\n🎰 لقد حصلت على فرصة في عجلة المكافآت!\n\nانقر على الرابط أدناه للدوران والفوز بالجوائز:\n${generateSpinWheelLink(customerMobile, pendingLog.mechanicId)}\n\n---\n\n✅ *Oil Change Confirmed!*\n\nThank you for confirming your oil change\n\n🎰 You've earned a spin on our reward wheel!\n\nClick the link below to spin and win prizes:\n${generateSpinWheelLink(customerMobile, pendingLog.mechanicId)}`);
                            // Optionally notify mechanic
                        }
                    } else if (buttonId === 'dispute') {
                        await sendMessage(customerMobile, `❌ *تم تقديم النزاع*\n\nتم تسجيل نزاع تغيير الزيت الخاص بك\n\nسيتصل بك فريقنا خلال 24 ساعة لحل هذه المشكلة\n\nللمساعدة الفورية: 920000000\n\n---\n\n❌ *Dispute Filed*\n\nYour oil change dispute has been recorded\n\nOur team will contact you within 24 hours to resolve this issue\n\nFor immediate assistance: 920000000`);
                    } else if (buttonId === 'go_menu') {
                        session.state = 'menu';
                        sessionManager.setSession(sender, session);
                        await showMainMenu(sender);
                        return;
                    }
                }
            } catch (error) {
                console.error("Error in webhook handler (async):", error);
            }
        });
    } catch (error) {
        console.error("Error in webhook handler (sync):", error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;