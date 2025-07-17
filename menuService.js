const { validateMechanicByPhone } = require('./apiService');
const { sendMessage } = require('./whatsappService');

async function showMainMenu(sender) {
    const mechanic = await validateMechanicByPhone(sender);
    const greeting = mechanic ? 
        `Hello ${mechanic.name} / مرحباً ${mechanic.nameAr}` : 
        'Hello / مرحباً';
    
    const menuText = `${greeting}! 👋

🔧 *Mechanic Oil Change System / نظام تغيير الزيت للميكانيكي*

Please select an option / يرجى اختيار خيار:

1️⃣ *Start Oil Change Submission / بدء تقديم تغيير الزيت*
   - Submit new oil change with QR codes and plate number
   - تقديم تغيير زيت جديد مع رموز QR ورقم اللوحة

2️⃣ *Check Wallet Balance / فحص رصيد المحفظة*
   - View your current earnings
   - عرض أرباحك الحالية

3️⃣ *View Daily Log / عرض السجل اليومي*
   - See today's completed oil changes
   - عرض تغييرات الزيت المكتملة اليوم

4️⃣ *Help / مساعدة*
   - Get assistance with the system
   - الحصول على مساعدة في النظام

Reply with the number (1-4) to proceed / رد برقم (1-4) للمتابعة`;

    await sendMessage(sender, menuText);
}

module.exports = { showMainMenu }; 