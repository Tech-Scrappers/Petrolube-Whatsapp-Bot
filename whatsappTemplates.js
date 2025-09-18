module.exports = {
  customer_approval_one: {
    name: "customer_approval_one",
    language: { code: "en_US" },
    components: [
      {
        type: "header",
        format: "TEXT",
        text: "Car Oil Change"
      },
      {
        type: "body",
        text: "Hi {{1}},\n\nYour car's oil change for {{2}} has been successfully completed."
      },
      {
        type: "buttons",
        buttons: [
          { type: "quick_reply", text: "YES" },
          { type: "quick_reply", text: "No" }
        ]
      }
    ]
  },
  customer_approval: {
    name: "customer_approval_utility",
    language: { code: "en" },
    components: [
      {
        type: "header",
        format: "TEXT",
        text: "Car Oil Change"
      },
      {
        type: "body",
        text: "Hello {{1}},\n\nYour car's oil change for {{2}} has been completed. Please tap “YES” to claim your reward."
      },
      {
        type: "footer",
        text: "Thanks for choosing Petrolube!"
      },
      {
        type: "buttons",
        buttons: [
          { type: "quick_reply", text: "YES" },
          { type: "quick_reply", text: "NO" }
        ]
      }
    ]
  },
  shop_registeration: {
    name: "shop_registeration",
    language: { code: "en" },
    components: [
      {
        type: "header",
        format: "TEXT",
        text: "Petrolube"
      },
      {
        type: "body",
        text: "Hello {{1}},\n\nWe’re excited to confirm that your shop {{2}} has been successfully registered for the Petrolube Buy, Display & Win (BDW) Campaign! Welcome aboard!"
      }
    ]
  },
  mechanic_onboarding: {
    name: "mechanic_onboarding",
    language: { code: "ar" },
    components: [
      {
        type: "body",
        text: "مرحبًا {{1}},\n\n🎉 أنت الآن مشارك رسميًا كميكانيكي في حملة Petrolube BDW لدى {{2}}. للدخول إلى نظام الميكانيكي الخاص بك عبر بوت واتساب، فقط أرسل \"hi\" أو \"menu\" لبدء التدفق."
      }
    ]
  },
  mechanic_onboarding_with_links: {
    name: "mechanic_onboarding_with_links",
    language: { code: "ar" },
    components: [
      {
        type: "body",
        text: "مرحبًا {{1}},\n\n🎉 أنت الآن مشارك رسميًا كميكانيكي في حملة Petrolube Compaign لدى {{2}}. للدخول إلى نظام الميكانيكي الخاص بك عبر بوت واتساب، فقط أرسل \"hi\" أو \"menu\" لبدء التدفق.\n\n📄 **يرجى قراءة الشروط والأحكام أدناه**"
      },
      {
        type: "buttons",
        buttons: [
          {
            type: "URL",
            text: "Terms & Conditions",
            url: "https://petrolube.app/{{3}}"
          }
        ]
      }
    ]
  },
  shop_onboarding_with_links: {
    name: "shop_onboarding_with_links",
    language: { code: "en" },
    components: [
      {
        type: "body",
        text: "Hello {{1}},\n\nWe're excited to confirm that your shop {{2}} has been successfully registered for the Petrolube Buy, Display & Win (BDW) Campaign! Welcome aboard!"
      },
      {
        type: "footer",
        text: "Please read below terms and conditions."
      },
      {
        type: "buttons",
        buttons: [
          {
            type: "URL",
            text: "Terms & Condition",
            url: "https://petrolube.app/{{3}}"
          }
        ]
      }
    ]
  },
  shop_ownboarding_arabic: {
    name: "shop_ownboarding_arabic",
    language: { code: "ar" },
    components: [
      {
        type: "body",
        text: "مرحبًا {{1}}،\n\nيسعدنا أن نؤكد تسجيل متجرك {{2}} بنجاح في حملة Petrolube Buy, Display & Win (BDW)!\nمرحبًا بك معنا!"
      },
      {
        type: "footer",
        text: "يرجى قراءة الشروط والأحكام أدناه"
      },
      {
        type: "buttons",
        buttons: [
          {
            type: "URL",
            text: "الشروط والأحكام",
            url: "https://petrolube.app/{{3}}"
          }
        ]
      }
    ]
  },
  customer_reminder_oil_change: {
    name: "customer_reminder_oil_change",
    language: { code: "ar" },
    components: [
      {
        type: "body",
        text: "ود لفت انتباهكم على ضرورة اتمام التسجيل في السحب وذلك عن طريق الاجابة (بنعم) من خلال رسالة التاكيد لإتمام تسجيل عملية تغيير الزيت بنجاح.\n\nWe would like to draw your attention to the necessity of completing your registration for the draw by answering (yes) in the confirmation message to successfully complete your oil change registration."
      }
    ]
  },
  mechanic_reminder_arabic: {
    name: "mechanic_reminder_arabic",
    language: { code: "ar" },
    components: [
      {
        type: "header",
        format: "VIDEO",
        text: "https://bot.petrolube.app/public/videos/mechanic-intro.mp4"
      },
      {
        type: "body",
        text: "حملة بترولوب مستمرة، لا تفوتكم فرصة المشاركة لربح جوائز اكثر!\n\nقم بمشاهدة الفيديو التعريفي لمعرفة خطوات تسجيل عمليات تغيير الزيت للعميل وكيفية المشاركة والاستفادة من الحملة"
      }
    ]
  },
  customer_mega_prizes: {
    name: "customer_mega_prizes",
    language: { code: "ar" },
    components: [
      {
        type: "header",
        format: "IMAGE",
        text: "https://bot.petrolube.app/public/images/customer-mega-prizes.jpg"
      },
      {
        type: "body",
        text: 'خليكم جاهزين للسحب الكبير يوم 28 مع حملة "اختار زيوت بترومين" من بترولوب، ولا تنسوا تستخدموا عجلة الجوائز للمزيد من الهدايا، كونوا على اتم الاستعداد.\n\nLucky Draw Alert! Win mega prizes at 28th with ‘Choose Petromin Oil’ campaign from Petrolube. Don’t forget to spin the wheel for more rewards, and get ready to win big!'
      }
    ]
  },
  choose_petromin_oil: {
    name: "choose_petromin_oil",
    language: { code: "ar" },
    components: [
      {
        type: "body",
        text: 'بترولوب للزيوت تكرم المتصدرين في حملة "اختر زيوت بترومين"\nنقدم لكم الفائزين بأفضل 10 فنيين في حملة اختر زيوت بترومين، وسوف يتم تقديم الجوائز غدا ان شاء الله.\n\nالسباق باقي ما خلص… كل عملية تغيير زيت تقربك للجوائز والفوز.\nشد حيلك، واصعد للصدارة وخذ مكانك بين الفائزين'
      }
    ]
  },
  heros_august: {
    name: "heros_august",
    language: { code: "ar" },
    components: [
      {
        type: "header",
        format: "IMAGE",
        text: "https://bot.petrolube.app/public/images/hero-mechanics-august.jpg"
      },
      {
        type: "body",
        text: 'نبارك لأفضل 10 مشاركين في حملة اختر زيوت بترومين\nاليوم يستلمون جوائزهم\nولا تنسى.. الحملة مازالت مستمرة، وفرصتك للفوز لسه قائمة، لا تفوتها'
      }
    ]
  },
  shop_compliance: {
    name: "shop_compliance",
    language: { code: "ar" },
    components: [
      {
        type: "body",
        text: 'تنبيه بعدم التوافق مع متطلبات الحملة\n\nعزيزي صاحب المتجر،\nيشير تقرير عرض المنتجات إلى أن عدد العبوات المتوفرة أقل من (60%)،  وهذا أقل من الحد المطلوب للحملة:\n•	الكمية المطلوبة: {{1}} عبوة\n•	المتوفر حالياً: {{2}} عبوة\n•	الكمية الناقصة: {{3}} عبوة\nنرجو منكم استكمال الكمية الناقصة في أسرع وقت ممكن لضمان التوافق مع شروط الحملة.'
      }
    ]
  },
  september_mega_prizes_customers: {
    name: "september_mega_prizes_customers",
    language: { code: "ar" },
    components: [
      {
        type: "body",
        text: `خليكم جاهزين للسحب الكبير يوم 11مع حملة "اختار زيوت بترومين" من بترولوب، ولا تنسوا تستخدموا عجلة الجوائز للمزيد من الهدايا، كونوا على اتم الاستعداد.\n\nWin mega prizes on 11th with ‘Choose Petromin Oil’ campaign from Petrolube.\nDon’t forget to spin the wheel for more rewards, and get ready to win big!`
      }
    ]
  },
  hero_mechanics_september: {
    name: "hero_mechanics_september",
    language: { code: "ar" },
    components: [
      {
        type: "body",
        text: `بترولوب للزيوت تكرم المتصدرين في حملة "اختر زيوت بترومين"\nنقدم لكم الفائزين بأفضل 10 فنيين في حملة اختر زيوت بترومين، وسوف يتم تقديم الجوائز بتاريخ 21 سبتمبر ان شاء الله.\n\nالسباق باقي ما خلص… كل عملية تغيير زيت تقربك للجوائز والفوز.\nشد حيلك، واصعد للصدارة وخذ مكانك بين الفائزين`
      }
    ]
  }
}; 