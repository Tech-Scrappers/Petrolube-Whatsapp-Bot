module.exports = {
  customer_approval: {
    name: "cusotmer_approval",
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
        text: "كونوا على أتم الاستعداد، انتم على موعد مع بداية حملة بترولوب غدًا بتاريخ 15 أغسطس\n\nقم بمشاهدة الفيديو التعريفي لمعرفة خطوات تسجيل عمليات تغيير الزيت للعميل وكيفية المشاركة والاستفادة من الحملة"
      }
    ]
  }
}; 