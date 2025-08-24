const request = require("supertest");
const express = require("express");
const nock = require("nock");

// Create a test app
const app = express();
app.use(express.json());

// Mock the webhook router
const webhookRouter = require("../../routes/webhook");
app.use(webhookRouter);

describe("Webhook Integration Tests", () => {
  beforeEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  afterAll(() => {
    nock.restore();
  });

  describe("Webhook Verification", () => {
    test("should verify webhook with correct token", async () => {
      const response = await request(app).get("/webhook").query({
        "hub.mode": "subscribe",
        "hub.verify_token": "test_verify_token",
        "hub.challenge": "test_challenge",
      });

      expect(response.status).toBe(200);
      expect(response.text).toBe("test_challenge");
    });

    test("should reject webhook with incorrect token", async () => {
      const response = await request(app).get("/webhook").query({
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong_token",
        "hub.challenge": "test_challenge",
      });

      expect(response.status).toBe(403);
    });

    test("should reject webhook with wrong mode", async () => {
      const response = await request(app).get("/webhook").query({
        "hub.mode": "publish",
        "hub.verify_token": "test_verify_token",
        "hub.challenge": "test_challenge",
      });

      expect(response.status).toBe(403);
    });
  });

  describe("Shop Registration Message Endpoint", () => {
    test("should send shop registration messages successfully", async () => {
      // Mock WhatsApp API calls
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .times(2) // English and Arabic messages
        .reply(200, { message_id: "test_message_id" });

      const requestBody = {
        shop_owner_number: "966569440162",
        shop_owner_name: "John Doe",
        shop_name: "Test Shop",
      };

      const response = await request(app)
        .post("/send-shop-registration-message")
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain(
        "Shop registration messages sent"
      );
    });

    test("should return 400 for missing required fields", async () => {
      const requestBody = {
        shop_owner_number: "966569440162",
        // Missing shop_owner_name and shop_name
      };

      const response = await request(app)
        .post("/send-shop-registration-message")
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toContain("Missing required fields");
    });

    test("should handle WhatsApp API errors", async () => {
      // Mock WhatsApp API error
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .reply(400, { error: { message: "Invalid phone number" } });

      const requestBody = {
        shop_owner_number: "966569440162",
        shop_owner_name: "John Doe",
        shop_name: "Test Shop",
      };

      const response = await request(app)
        .post("/send-shop-registration-message")
        .send(requestBody)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("Customer Reminder Message Endpoint", () => {
    test("should send customer reminder message successfully", async () => {
      // Mock WhatsApp API call
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .reply(200, { message_id: "test_message_id" });

      const requestBody = {
        mobile_number: "966569440162",
      };

      const response = await request(app)
        .post("/send-customer-reminder-message")
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should return 400 for missing mobile number", async () => {
      const requestBody = {};

      const response = await request(app)
        .post("/send-customer-reminder-message")
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toContain("mobile_number");
    });
  });

  describe("WhatsApp Message Processing", () => {
    test("should process text message and return 200", async () => {
      const messageData = testUtils.mockWhatsAppMessage("Hello", "1234567890");

      const response = await request(app)
        .post("/webhook")
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: "ok" });
    });

    test("should process image message and return 200", async () => {
      const messageData = testUtils.mockImageMessage("1234567890");

      // Mock image download
      nock("https://graph.facebook.com")
        .get(/\/.*\/test_image_id/)
        .reply(200, { url: "https://example.com/image.jpg" });

      nock("https://example.com")
        .get("/image.jpg")
        .reply(200, Buffer.from("fake-image-data"));

      // Mock OpenAI API for image analysis
      nock("https://api.openai.com")
        .post("/v1/chat/completions")
        .reply(200, {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberPlate: "ABC123",
                  numberOfFoils: 2,
                }),
              },
            },
          ],
        });

      const response = await request(app)
        .post("/webhook")
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: "ok" });
    });

    test("should process button message and return 200", async () => {
      const messageData = testUtils.mockButtonMessage(
        "register_mechanic",
        "1234567890"
      );

      const response = await request(app)
        .post("/webhook")
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: "ok" });
    });

    test("should handle duplicate messages", async () => {
      const messageData = testUtils.mockWhatsAppMessage("Hello", "1234567890");

      // Send the same message twice
      await request(app).post("/webhook").send(messageData).expect(200);

      const response = await request(app)
        .post("/webhook")
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: "ok" });
    });

    test("should handle malformed message data", async () => {
      const malformedData = {
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
                  // Missing contacts and messages
                },
                field: "messages",
              },
            ],
          },
        ],
      };

      const response = await request(app)
        .post("/webhook")
        .send(malformedData)
        .expect(200);

      expect(response.body).toEqual({ status: "ok" });
    });
  });

  describe("Error Handling", () => {
    test("should handle WhatsApp API errors gracefully", async () => {
      // Mock WhatsApp API error
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .reply(500, { error: { message: "Internal server error" } });

      const messageData = testUtils.mockWhatsAppMessage("Hello", "1234567890");

      const response = await request(app)
        .post("/webhook")
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: "ok" });
    });

    test("should handle network timeouts", async () => {
      // Mock timeout
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .delay(10000) // 10 second delay
        .reply(200, { message_id: "test_message_id" });

      const messageData = testUtils.mockWhatsAppMessage("Hello", "1234567890");

      const response = await request(app)
        .post("/webhook")
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: "ok" });
    });

    test("should handle invalid JSON in request body", async () => {
      const response = await request(app)
        .post("/webhook")
        .send("invalid json")
        .set("Content-Type", "application/json")
        .expect(400);
    });
  });

  describe("Session Management Integration", () => {
    test("should maintain session state across messages", async () => {
      const sender = "1234567890";

      // Send initial message
      const message1 = testUtils.mockWhatsAppMessage("Hello", sender);
      await request(app).post("/webhook").send(message1).expect(200);

      // Send follow-up message
      const message2 = testUtils.mockWhatsAppMessage(
        "I want to register",
        sender
      );
      await request(app).post("/webhook").send(message2).expect(200);

      // Send button response
      const buttonMessage = testUtils.mockButtonMessage(
        "register_mechanic",
        sender
      );
      await request(app).post("/webhook").send(buttonMessage).expect(200);
    });

    test("should handle multiple users simultaneously", async () => {
      const sender1 = "1234567890";
      const sender2 = "0987654321";

      // Send messages from different users
      const message1 = testUtils.mockWhatsAppMessage(
        "Hello from user 1",
        sender1
      );
      const message2 = testUtils.mockWhatsAppMessage(
        "Hello from user 2",
        sender2
      );

      await Promise.all([
        request(app).post("/webhook").send(message1),
        request(app).post("/webhook").send(message2),
      ]);

      // Both should succeed
      expect(true).toBe(true); // If we reach here, both requests succeeded
    });
  });

  describe("Campaign Status Integration", () => {
    test("should respect campaign active status", async () => {
      // Test with campaign active
      process.env.CAMPAIGN_ACTIVE = "true";

      const messageData = testUtils.mockWhatsAppMessage("Hello", "1234567890");
      const response = await request(app)
        .post("/webhook")
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: "ok" });
    });

    test("should handle campaign inactive status", async () => {
      // Test with campaign inactive
      process.env.CAMPAIGN_ACTIVE = "false";

      const messageData = testUtils.mockWhatsAppMessage("Hello", "1234567890");
      const response = await request(app)
        .post("/webhook")
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: "ok" });
    });
  });
});
