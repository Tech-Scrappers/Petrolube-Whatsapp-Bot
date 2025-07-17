const express = require('express');
const router = express.Router();
const { sendMessage, downloadImage, sendTemplateMessage } = require('../whatsappService');
const { extractNumberPlate, detectNumberOfFoils } = require('../openaiService');
const sessionManager = require('../sessionManager');
const { validateMechanicByPhone, validateQRCodes, validateCustomer, updateMechanicWallet, logOilChange, WHATSAPP_API_URL, API_TOKEN, PHONE_NUMBER_ID, OPENAI_API_KEY, PYTHON_QR_API_URL, EXTERNAL_API_BASE_URL } = require('../apiService');
const { showMainMenu } = require('../menuService');

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

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
        form.append('image', imageBuffer, { filename: 'image.jpg' });
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
// Main webhook handler (POST)
router.post('/webhook', async (req, res) => {
    try {
        if (!req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
            return res.status(200).send('OK');
        }
        const message = req.body.entry[0].changes[0].value.messages[0];
        const sender = message.from;
        let session = sessionManager.getSession(sender);
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
                    await sendMessage(sender, `✅ Mechanic verified / تم التحقق من الميكانيكي: ${mechanic.name} / ${mechanic.nameAr}\n\n📸 Please send a photo of the circular foils (QR codes) / يرجى إرسال صورة للأغطية الدائرية (رموز QR)\n\n*Note / ملاحظة:* Make sure all circular foils are visible in the photo / تأكد من أن جميع الأغطية الدائرية مرئية في الصورة`);
                } else {
                    await sendMessage(sender, "❌ Mechanic not found / لم يتم العثور على الميكانيكي\n\nPlease contact support / يرجى الاتصال بالدعم\n\n+966501234567");
                    session.state = 'menu';
                }
            } else if (text === '2' || text === 'wallet' || text === 'balance') {
                const mechanic = await validateMechanicByPhone(sender);
                if (mechanic && sessionManager.hasWallet(mechanic.id)) {
                    const balance = sessionManager.getWallet(mechanic.id);
                    await sendMessage(sender, `💰 *Wallet Balance / رصيد المحفظة*\n\nCurrent Balance / الرصيد الحالي: ${balance} SAR\n\nTo start earning, begin an oil change submission / لبدء الربح، ابدأ بتقديم تغيير زيت`);
                } else {
                    await sendMessage(sender, "💰 *Wallet Balance / رصيد المحفظة*\n\nNo wallet found / لم يتم العثور على محفظة\n\nPlease complete an oil change submission first / يرجى إكمال تقديم تغيير زيت أولاً");
                }
                session.state = 'menu';
            } else if (text === '3' || text === 'log' || text === 'daily') {
                const mechanic = await validateMechanicByPhone(sender);
                if (mechanic) {
                    const today = new Date().toDateString();
                    const todayLogs = sessionManager.getOilChangeLogsByMechanic(mechanic.id).filter(log => new Date(log.timestamp).toDateString() === today);
                    if (todayLogs.length > 0) {
                        let logText = `📋 *Today's Oil Changes / تغييرات الزيت اليوم*\n\n`;
                        todayLogs.forEach((log, index) => {
                            logText += `${index + 1}. Plate / لوحة: ${log.plateNumber}\n`;
                            logText += `   Customer / العميل: ${log.customerMobile}\n`;
                            logText += `   Status / الحالة: ${log.status}\n\n`;
                        });
                        await sendMessage(sender, logText);
                    } else {
                        await sendMessage(sender, "📋 *Today's Oil Changes / تغييرات الزيت اليوم*\n\nNo oil changes completed today / لم يتم إكمال تغييرات زيت اليوم");
                    }
                } else {
                    await sendMessage(sender, "Please start an oil change submission first to view your logs / يرجى بدء تقديم تغيير زيت أولاً لعرض سجلاتك");
                }
                session.state = 'menu';
            } else if (text === '4' || text === 'help') {
                const helpText = `🆘 *Help & Instructions / المساعدة والتعليمات*\n\n*How to submit an oil change / كيفية تقديم تغيير زيت:*\n1. Start oil change submission / بدء تقديم تغيير الزيت\n2. Send photo of circular foils (QR codes) / إرسال صورة للأغطية الدائرية (رموز QR)\n3. Send photo of car number plate / إرسال صورة لوحة السيارة\n4. Enter customer mobile number / إدخال رقم هاتف العميل\n5. Wait for customer confirmation / انتظار تأكيد العميل\n\n*Requirements / المتطلبات:*\n• Clear photo of circular foils / صورة واضحة للأغطية الدائرية\n• Clear photo of number plate / صورة واضحة للوحة السيارة\n• Valid customer mobile number / رقم هاتف عميل صحيح\n\n*Rewards / المكافآت:*\n• 4 SAR per confirmed oil change / 4 ريال لكل تغيير زيت مؤكد\n• Instant wallet credit after customer approval / رصيد فوري في المحفظة بعد موافقة العميل\n\nFor technical support / للدعم الفني: support@example.com`;
                await sendMessage(sender, helpText);
                session.state = 'menu';
            } else if (text === 'menu' || text === 'main' || text === 'home') {
                session.state = 'menu';
                await showMainMenu(sender);
            } else if (session.state === 'customer_mobile') {
                const mobileNumber = text.replace(/\D/g, '');
                if (mobileNumber.length >= 10) {
                    session.data.customerMobile = mobileNumber;
                    session.state = 'customer_name';
                    await sendMessage(sender, `👤 Please enter the customer's name / يرجى إدخال اسم العميل:`);
                } else {
                    await sendMessage(sender, "❌ Invalid mobile number / رقم هاتف غير صحيح\n\nPlease enter a valid mobile number / يرجى إدخال رقم هاتف صحيح:");
                }
            } else if (session.state === 'customer_name') {
                const customerName = message.text.body.trim();
                session.data.customerName = customerName;
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
                    const apiResponse = await axios.post(`${process.env.EXTERNAL_API_BASE_URL}/bot/mechanics/${session.data.mechanicId}/oil-change`, apiBody);
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
                        await sendMessage(sender, `💰 *Reward Earned! / تم الحصول على المكافأة!*\n\nOil change submitted.\n\n✅ +4 SAR added to your wallet / تم إضافة 4 ريال إلى محفظتك\n💰 New Balance / الرصيد الجديد: ${newBalance} SAR\n\nKeep up the great work! / استمر في العمل الجيد!`);
                        await sendTemplateMessage(session.data.customerMobile, session.data.customerName);
                        sessionManager.setCustomerToLog(session.data.customerMobile, logId);
                        const spinLink = generateSpinWheelLink(session.data.customerMobile, logId);
                        await sendMessage(
                            session.data.customerMobile,
                            `🎰 *Spin the Reward Wheel!* / *قم بتدوير عجلة المكافآت!*\n\nThank you for your oil change! / شكراً لك على تغيير الزيت!\n\nClick below to spin and win prizes: / انقر أدناه للدوران والفوز بالجوائز:\n${spinLink}`,
                            [
                                {
                                    type: 'reply',
                                    reply: {
                                        id: 'dispute',
                                        title: 'Dispute / نزاع'
                                    }
                                }
                            ]
                        );
                        session.data.logId = logId;
                        session.state = 'waiting_confirmation';
                    } else {
                        const errorMsg = (apiResponse.data && apiResponse.data.message) ? apiResponse.data.message : '❌ Oil change submission failed. Please try again or contact support.';
                        await sendMessage(sender, errorMsg);
                        session.state = 'menu';
                    }
                } catch (apiError) {
                    let errorMsg = '❌ Oil change submission failed. Please try again or contact support.';
                    if (apiError.response && apiError.response.data && apiError.response.data.message) {
                        errorMsg = apiError.response.data.message;
                    } else if (apiError.message) {
                        errorMsg = apiError.message;
                    }
                    await sendMessage(sender, errorMsg);
                    session.state = 'menu';
                }
            } else {
                await showMainMenu(sender);
                session.state = 'menu';
            }
        } else if (message.type === 'image') {
            const imageBuffer = await downloadImage(message.image.id);
            if (session.state === 'qr_codes') {
                const foilCount = await detectNumberOfFoils(imageBuffer);
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
                    await sendMessage(sender, `❌ Not enough QR codes detected for the number of foils.\n\nDetected foils: ${foilCount}\nDetected QR codes: ${qrCodes.length}\n\nPlease retake the photo and ensure all QR codes are visible on the foils. / يرجى إعادة التقاط الصورة والتأكد من أن جميع رموز QR مرئية على الأغطية الدائرية.`);
                    return;
                }
                if (qrCodes.length > 0) {
                    const qrValidation = await validateQRCodes(qrCodes);
                    session.data.qrCodes = qrCodes;
                    session.data.foilCount = foilCount;
                    session.data.qrCodesMissing = qrCodesMissing;
                    session.state = 'number_plate';
                    let responseText = `📸 *QR Codes Scanned / تم مسح رموز QR*\n\n`;
                    responseText += `Detected Foils / الأغطية الدائرية المكتشفة: ${foilCount}\n`;
                    responseText += `Found / تم العثور على ${qrCodes.length} QR codes / رموز QR:\n`;
                    qrCodes.forEach((code, index) => {
                        responseText += `${index + 1}. ${code}\n`;
                    });
                    responseText += `\n${qrValidation.message}\n\n📸 Now please send a photo of the car's number plate / الآن يرجى إرسال صورة لوحة السيارة`;
                    await sendMessage(sender, responseText);
                } else {
                    await sendMessage(sender, "❌ No QR codes detected / لم يتم اكتشاف رموز QR\n\nPlease ensure all circular foils are clearly visible and try again / يرجى التأكد من أن جميع الأغطية الدائرية مرئية بوضوح والمحاولة مرة أخرى");
                }
            } else if (session.state === 'number_plate') {
                const plateNumber = await extractNumberPlate(imageBuffer);
                if (plateNumber) {
                    session.data.plateNumber = plateNumber;
                    session.state = 'customer_mobile';
                    await sendMessage(sender, `🚗 *Number Plate Detected / تم اكتشاف لوحة السيارة*\n\nPlate Number / رقم اللوحة: ${plateNumber}\n\n📱 Please enter the customer's mobile number / يرجى إدخال رقم هاتف العميل:`);
                } else {
                    await sendMessage(sender, "❌ Could not detect the number plate / لم يتم اكتشاف لوحة السيارة\n\nPlease ensure the plate is clearly visible and try again / يرجى التأكد من أن اللوحة مرئية بوضوح والمحاولة مرة أخرى");
                }
            } else {
                await sendMessage(sender, "Please follow the submission process / يرجى اتباع عملية التقديم\n\nType 'menu' to start over / اكتب 'menu' للبدء من جديد");
                session.state = 'menu';
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
                    await sendMessage(customerMobile, `✅ *Oil Change Confirmed! / تم تأكيد تغيير الزيت!*\n\nThank you for confirming your oil change / شكراً لك على تأكيد تغيير الزيت\n\n🎰 You've earned a spin on our reward wheel! / لقد حصلت على فرصة في عجلة المكافآت!\n\nClick the link below to spin and win prizes / انقر على الرابط أدناه للدوران والفوز بالجوائز:\n${generateSpinWheelLink(customerMobile, pendingLog.mechanicId)}`);
                    // Optionally notify mechanic
                }
            } else if (buttonId === 'dispute') {
                await sendMessage(customerMobile, `❌ *Dispute Filed / تم تقديم النزاع*\n\nYour oil change dispute has been recorded / تم تسجيل نزاع تغيير الزيت الخاص بك\n\nOur team will contact you within 24 hours to resolve this issue / سيتصل بك فريقنا خلال 24 ساعة لحل هذه المشكلة\n\nFor immediate assistance / للمساعدة الفورية: 920000000`);
            }
        }
        // Save session
        sessionManager.setSession(sender, session);
        res.status(200).send('OK');
    } catch (error) {
        console.error("Error handling message:", error);
        res.status(500).send('Error');
    }
});

module.exports = router; 