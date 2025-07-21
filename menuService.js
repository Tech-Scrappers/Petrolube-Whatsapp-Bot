const { validateMechanicByPhone } = require('./apiService');
const { sendMessage } = require('./whatsappService');

async function showMainMenu(sender) {
    const mechanic = await validateMechanicByPhone(sender);
    const greeting = mechanic ? 
        `مرحباً ${mechanic.nameAr}` : 
        'مرحباً';
    const greetingEn = mechanic ? `Hello ${mechanic.name}` : 'Hello';

    const menuText = `${greetingEn}! 👋
${greeting}! 👋

🔧 نظام تغيير الزيت للميكانيكي
🔧 Mechanic Oil Change System

يرجى اختيار خيار:
Please select an option:

⿡ بدء تقديم تغيير الزيت
   - تقديم تغيير زيت جديد مع رموز QR ورقم اللوحة
⿡ Start Oil Change Submission
   - Submit new oil change with QR codes and plate number

⿢ فحص رصيد المحفظة
   - عرض أرباحك الحالية
⿢ Check Wallet Balance
   - View your current earnings

⿣ عرض المتصدرين
   - عرض أفضل الميكانيكيين وترتيبك
⿣ View Leaderboard
   - See top mechanics and your ranking

⿤ مساعدة
   - الحصول على مساعدة في النظام
⿤ Help
   - Get assistance with the system

رد برقم (1-4) للمتابعة
Reply with the number (1-4) to proceed`;

    await sendMessage(sender, menuText);
}

module.exports = { showMainMenu }; 