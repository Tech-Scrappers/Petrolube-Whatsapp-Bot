// Test setup file
require("dotenv").config({ path: ".env.test" });

// Mock environment variables for testing
process.env.WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";
process.env.API_TOKEN = "test_api_token";
process.env.PHONE_NUMBER_ID = "test_phone_number_id";
process.env.WEBHOOK_VERIFY_TOKEN = "test_verify_token";
process.env.OPENAI_API_KEY = "test_openai_key";
process.env.PYTHON_QR_API_URL = "http://localhost:5000";
process.env.EXTERNAL_API_BASE_URL = "http://localhost:3001";
process.env.CAMPAIGN_ACTIVE = "true";
process.env.PETROLUBE_TERMS_URL_OWNER = "https://example.com/terms.pdf";

// Global test utilities
global.testUtils = {
  mockWhatsAppMessage: (text, sender = "1234567890") => ({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "test_entry_id",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "1234567890",
                phone_number_id: "test_phone_number_id",
              },
              contacts: [
                {
                  profile: { name: "Test User" },
                  wa_id: sender,
                },
              ],
              messages: [
                {
                  from: sender,
                  id: "test_message_id",
                  timestamp: Date.now(),
                  type: "text",
                  text: { body: text },
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  }),

  mockImageMessage: (sender = "1234567890") => ({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "test_entry_id",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "1234567890",
                phone_number_id: "test_phone_number_id",
              },
              contacts: [
                {
                  profile: { name: "Test User" },
                  wa_id: sender,
                },
              ],
              messages: [
                {
                  from: sender,
                  id: "test_image_id",
                  timestamp: Date.now(),
                  type: "image",
                  image: {
                    id: "test_image_id",
                    mime_type: "image/jpeg",
                    sha256: "test_sha256",
                    filename: "test_image.jpg",
                  },
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  }),

  mockButtonMessage: (buttonId, sender = "1234567890") => ({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "test_entry_id",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "1234567890",
                phone_number_id: "test_phone_number_id",
              },
              contacts: [
                {
                  profile: { name: "Test User" },
                  wa_id: sender,
                },
              ],
              messages: [
                {
                  from: sender,
                  id: "test_button_id",
                  timestamp: Date.now(),
                  type: "interactive",
                  interactive: {
                    type: "button_reply",
                    button_reply: {
                      id: buttonId,
                      title: "Test Button",
                    },
                  },
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  }),
};

// Suppress console.log during tests unless explicitly needed
const originalLog = console.log;
const originalError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
  console.error = originalError;
});
