const { validateMechanicByPhone } = require('./apiService');
const { sendMessage } = require('./whatsappService');

async function showMainMenu(sender) {
    const mechanic = await validateMechanicByPhone(sender);
    const greeting = mechanic ? 
        `مرحباً ${mechanic.nameAr}` : 
        'مرحباً';
    
    const menuText = `${greeting}! 👋
 
🔧 *نظام تغيير الزيت للميكانيكي*
 
يرجى اختيار خيار:
 
1️⃣ *بدء تقديم تغيير الزيت*
   - تقديم تغيير زيت جديد مع رموز QR ورقم اللوحة
 
2️⃣ *فحص رصيد المحفظة*
   - عرض أرباحك الحالية
 
3️⃣ *عرض المتصدرين*
   - عرض أفضل الميكانيكيين وترتيبك
 
4️⃣ *مساعدة*
   - الحصول على مساعدة في النظام
 
رد برقم (1-4) للمتابعة

---

Hello ${mechanic ? mechanic.name : ''}! 👋

🔧 *Mechanic Oil Change System*

Please select an option:

1️⃣ *Start Oil Change Submission*
   - Submit new oil change with QR codes and plate number

2️⃣ *Check Wallet Balance*
   - View your current earnings

3️⃣ *View Leaderboard*
   - See top mechanics and your ranking

4️⃣ *Help*
   - Get assistance with the system

Reply with the number (1-4) to proceed`;

    await sendMessage(sender, menuText);
}

module.exports = { showMainMenu }; 