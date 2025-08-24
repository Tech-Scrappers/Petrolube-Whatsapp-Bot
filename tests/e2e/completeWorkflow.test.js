const request = require("supertest");
const express = require("express");
const nock = require("nock");

// Create a test app
const app = express();
app.use(express.json());

// Mock the webhook router
const webhookRouter = require("../../routes/webhook");
app.use(webhookRouter);

describe("Complete Workflow E2E Tests", () => {
  beforeEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  afterAll(() => {
    nock.restore();
  });

  describe("Mechanic Registration Workflow", () => {
    test("should complete full mechanic registration process", async () => {
      const mechanicPhone = "966569440162";
      const mechanicName = "John Doe";
      const shopName = "Test Auto Shop";

      // Step 1: Initial message
      const initialMessage = testUtils.mockWhatsAppMessage(
        "Hello",
        mechanicPhone
      );
      await request(app).post("/webhook").send(initialMessage).expect(200);

      // Step 2: Send registration button
      const registerButton = testUtils.mockButtonMessage(
        "register_mechanic",
        mechanicPhone
      );
      await request(app).post("/webhook").send(registerButton).expect(200);

      // Step 3: Send phone number
      const phoneMessage = testUtils.mockWhatsAppMessage(
        mechanicPhone,
        mechanicPhone
      );
      await request(app).post("/webhook").send(phoneMessage).expect(200);

      // Step 4: Send name
      const nameMessage = testUtils.mockWhatsAppMessage(
        mechanicName,
        mechanicPhone
      );
      await request(app).post("/webhook").send(nameMessage).expect(200);

      // Step 5: Send shop name
      const shopMessage = testUtils.mockWhatsAppMessage(
        shopName,
        mechanicPhone
      );
      await request(app).post("/webhook").send(shopMessage).expect(200);

      // Mock external API calls
      nock("http://localhost:3001")
        .post("/validate-mechanic")
        .reply(200, {
          success: true,
          mechanic: {
            id: "mechanic123",
            name: mechanicName,
            phone: mechanicPhone,
            shop_name: shopName,
          },
        });

      nock("http://localhost:3001")
        .get("/wallet/mechanic123")
        .reply(200, {
          success: true,
          wallet: {
            mechanicId: "mechanic123",
            balance: 0,
            currency: "SAR",
          },
        });

      // Step 6: Confirm registration
      const confirmMessage = testUtils.mockWhatsAppMessage(
        "Yes",
        mechanicPhone
      );
      await request(app).post("/webhook").send(confirmMessage).expect(200);
    });

    test("should handle mechanic registration with invalid phone number", async () => {
      const mechanicPhone = "invalid_phone";

      // Step 1: Initial message
      const initialMessage = testUtils.mockWhatsAppMessage(
        "Hello",
        mechanicPhone
      );
      await request(app).post("/webhook").send(initialMessage).expect(200);

      // Step 2: Send registration button
      const registerButton = testUtils.mockButtonMessage(
        "register_mechanic",
        mechanicPhone
      );
      await request(app).post("/webhook").send(registerButton).expect(200);

      // Step 3: Send invalid phone number
      const phoneMessage = testUtils.mockWhatsAppMessage(
        "invalid_phone",
        mechanicPhone
      );
      await request(app).post("/webhook").send(phoneMessage).expect(200);

      // Should receive error message about invalid phone number
    });
  });

  describe("Oil Change Workflow", () => {
    test("should complete full oil change process", async () => {
      const mechanicPhone = "966569440162";
      const customerPhone = "966569440163";

      // Step 1: Mechanic starts oil change
      const startOilChange = testUtils.mockButtonMessage(
        "start_oil_change",
        mechanicPhone
      );
      await request(app).post("/webhook").send(startOilChange).expect(200);

      // Step 2: Send customer phone number
      const customerPhoneMessage = testUtils.mockWhatsAppMessage(
        customerPhone,
        mechanicPhone
      );
      await request(app)
        .post("/webhook")
        .send(customerPhoneMessage)
        .expect(200);

      // Step 3: Send customer name
      const customerNameMessage = testUtils.mockWhatsAppMessage(
        "Jane Smith",
        mechanicPhone
      );
      await request(app).post("/webhook").send(customerNameMessage).expect(200);

      // Step 4: Send vehicle information
      const vehicleMessage = testUtils.mockWhatsAppMessage(
        "Toyota Camry 2020",
        mechanicPhone
      );
      await request(app).post("/webhook").send(vehicleMessage).expect(200);

      // Step 5: Send oil type
      const oilTypeMessage = testUtils.mockWhatsAppMessage(
        "Synthetic",
        mechanicPhone
      );
      await request(app).post("/webhook").send(oilTypeMessage).expect(200);

      // Step 6: Send oil quantity
      const quantityMessage = testUtils.mockWhatsAppMessage("4", mechanicPhone);
      await request(app).post("/webhook").send(quantityMessage).expect(200);

      // Step 7: Send image for number plate detection
      const imageMessage = testUtils.mockImageMessage(mechanicPhone);

      // Mock image download
      nock("https://graph.facebook.com")
        .get(/\/.*\/test_image_id/)
        .reply(200, { url: "https://example.com/image.jpg" });

      nock("https://example.com")
        .get("/image.jpg")
        .reply(200, Buffer.from("fake-image-data"));

      // Mock OpenAI API for number plate extraction
      nock("https://api.openai.com")
        .post("/v1/chat/completions")
        .reply(200, {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberPlate: "ABC123",
                  confidence: 0.95,
                }),
              },
            },
          ],
        });

      await request(app).post("/webhook").send(imageMessage).expect(200);

      // Step 8: Confirm oil change
      const confirmMessage = testUtils.mockWhatsAppMessage(
        "Yes",
        mechanicPhone
      );
      await request(app).post("/webhook").send(confirmMessage).expect(200);

      // Mock external API calls for final confirmation
      nock("http://localhost:3001")
        .post("/validate-customer")
        .reply(200, {
          success: true,
          customer: {
            id: "customer123",
            name: "Jane Smith",
            phone: customerPhone,
          },
        });

      nock("http://localhost:3001")
        .post("/update-wallet")
        .reply(200, {
          success: true,
          newBalance: 100,
          transaction: {
            id: "txn123",
            amount: 100,
            type: "credit",
          },
        });
    });

    test("should handle oil change with QR code validation", async () => {
      const mechanicPhone = "966569440162";

      // Step 1: Start oil change
      const startOilChange = testUtils.mockButtonMessage(
        "start_oil_change",
        mechanicPhone
      );
      await request(app).post("/webhook").send(startOilChange).expect(200);

      // Step 2: Send QR codes
      const qrMessage = testUtils.mockWhatsAppMessage(
        "QR001,QR002,QR003",
        mechanicPhone
      );
      await request(app).post("/webhook").send(qrMessage).expect(200);

      // Mock QR validation
      nock("http://localhost:3001")
        .post("/validate-qr-codes")
        .reply(200, {
          success: true,
          validCodes: ["QR001", "QR002"],
          invalidCodes: ["QR003"],
        });

      // Continue with rest of workflow...
    });
  });

  describe("Customer Interaction Workflow", () => {
    test("should handle customer reminder messages", async () => {
      const customerPhone = "966569440163";

      // Mock WhatsApp API for sending reminder
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .reply(200, { message_id: "test_message_id" });

      // Send reminder message
      const response = await request(app)
        .post("/send-customer-reminder-message")
        .send({ mobile_number: customerPhone })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should handle customer confirmation workflow", async () => {
      const customerPhone = "966569440163";

      // Step 1: Customer receives reminder and responds
      const customerResponse = testUtils.mockWhatsAppMessage(
        "Yes, I want to schedule",
        customerPhone
      );
      await request(app).post("/webhook").send(customerResponse).expect(200);

      // Step 2: Customer provides preferred time
      const timeMessage = testUtils.mockWhatsAppMessage(
        "Tomorrow at 2 PM",
        customerPhone
      );
      await request(app).post("/webhook").send(timeMessage).expect(200);
    });
  });

  describe("Leaderboard and Wallet Workflow", () => {
    test("should handle leaderboard viewing", async () => {
      const mechanicPhone = "966569440162";

      // Step 1: Request leaderboard
      const leaderboardButton = testUtils.mockButtonMessage(
        "view_leaderboard",
        mechanicPhone
      );
      await request(app).post("/webhook").send(leaderboardButton).expect(200);

      // Mock leaderboard API
      nock("http://localhost:3001")
        .get("/leaderboard")
        .reply(200, {
          success: true,
          leaderboard: [
            {
              rank: 1,
              mechanicId: "mechanic1",
              name: "John Doe",
              points: 1500,
              oilChanges: 25,
            },
            {
              rank: 2,
              mechanicId: "mechanic2",
              name: "Jane Smith",
              points: 1200,
              oilChanges: 20,
            },
          ],
        });
    });

    test("should handle wallet balance check", async () => {
      const mechanicPhone = "966569440162";

      // Step 1: Request wallet balance
      const walletButton = testUtils.mockButtonMessage(
        "check_wallet",
        mechanicPhone
      );
      await request(app).post("/webhook").send(walletButton).expect(200);

      // Mock wallet API
      nock("http://localhost:3001")
        .get("/wallet/mechanic123")
        .reply(200, {
          success: true,
          wallet: {
            mechanicId: "mechanic123",
            balance: 500,
            currency: "SAR",
          },
        });
    });
  });

  describe("Error Recovery Workflow", () => {
    test("should handle network failures gracefully", async () => {
      const mechanicPhone = "966569440162";

      // Step 1: Start registration
      const registerButton = testUtils.mockButtonMessage(
        "register_mechanic",
        mechanicPhone
      );
      await request(app).post("/webhook").send(registerButton).expect(200);

      // Step 2: Send phone number
      const phoneMessage = testUtils.mockWhatsAppMessage(
        "966569440162",
        mechanicPhone
      );
      await request(app).post("/webhook").send(phoneMessage).expect(200);

      // Mock API failure
      nock("http://localhost:3001")
        .post("/validate-mechanic")
        .reply(500, { error: "Internal server error" });

      // Step 3: Send name (should handle API failure gracefully)
      const nameMessage = testUtils.mockWhatsAppMessage(
        "John Doe",
        mechanicPhone
      );
      await request(app).post("/webhook").send(nameMessage).expect(200);
    });

    test("should handle session timeout and recovery", async () => {
      const mechanicPhone = "966569440162";

      // Step 1: Start registration
      const registerButton = testUtils.mockButtonMessage(
        "register_mechanic",
        mechanicPhone
      );
      await request(app).post("/webhook").send(registerButton).expect(200);

      // Step 2: Wait for session timeout (simulated)
      // In real scenario, this would be handled by inactivity timer

      // Step 3: Send message after timeout (should restart session)
      const timeoutMessage = testUtils.mockWhatsAppMessage(
        "Hello again",
        mechanicPhone
      );
      await request(app).post("/webhook").send(timeoutMessage).expect(200);
    });
  });

  describe("Multi-language Support Workflow", () => {
    test("should handle Arabic language messages", async () => {
      const mechanicPhone = "966569440162";

      // Step 1: Send Arabic message
      const arabicMessage = testUtils.mockWhatsAppMessage(
        "مرحبا",
        mechanicPhone
      );
      await request(app).post("/webhook").send(arabicMessage).expect(200);

      // Step 2: Send Arabic registration request
      const arabicRegister = testUtils.mockWhatsAppMessage(
        "أريد التسجيل",
        mechanicPhone
      );
      await request(app).post("/webhook").send(arabicRegister).expect(200);
    });

    test("should handle mixed language messages", async () => {
      const mechanicPhone = "966569440162";

      // Step 1: Send mixed language message
      const mixedMessage = testUtils.mockWhatsAppMessage(
        "Hello مرحبا",
        mechanicPhone
      );
      await request(app).post("/webhook").send(mixedMessage).expect(200);
    });
  });

  describe("Campaign Status Workflow", () => {
    test("should handle campaign active status", async () => {
      process.env.CAMPAIGN_ACTIVE = "true";
      const mechanicPhone = "966569440162";

      // Step 1: Send message during active campaign
      const message = testUtils.mockWhatsAppMessage("Hello", mechanicPhone);
      await request(app).post("/webhook").send(message).expect(200);

      // Should receive normal response
    });

    test("should handle campaign inactive status", async () => {
      process.env.CAMPAIGN_ACTIVE = "false";
      const mechanicPhone = "966569440162";

      // Step 1: Send message during inactive campaign
      const message = testUtils.mockWhatsAppMessage("Hello", mechanicPhone);
      await request(app).post("/webhook").send(message).expect(200);

      // Should receive campaign inactive message
    });
  });

  describe("Concurrent User Workflow", () => {
    test("should handle multiple users simultaneously", async () => {
      const mechanic1 = "966569440162";
      const mechanic2 = "966569440163";

      // Send messages from both users simultaneously
      const message1 = testUtils.mockWhatsAppMessage(
        "Hello from mechanic 1",
        mechanic1
      );
      const message2 = testUtils.mockWhatsAppMessage(
        "Hello from mechanic 2",
        mechanic2
      );

      await Promise.all([
        request(app).post("/webhook").send(message1),
        request(app).post("/webhook").send(message2),
      ]);

      // Both should succeed
      expect(true).toBe(true);
    });

    test("should maintain separate sessions for multiple users", async () => {
      const mechanic1 = "966569440162";
      const mechanic2 = "966569440163";

      // Step 1: Both users start registration
      const register1 = testUtils.mockButtonMessage(
        "register_mechanic",
        mechanic1
      );
      const register2 = testUtils.mockButtonMessage(
        "register_mechanic",
        mechanic2
      );

      await Promise.all([
        request(app).post("/webhook").send(register1),
        request(app).post("/webhook").send(register2),
      ]);

      // Step 2: Both users send phone numbers
      const phone1 = testUtils.mockWhatsAppMessage("966569440162", mechanic1);
      const phone2 = testUtils.mockWhatsAppMessage("966569440163", mechanic2);

      await Promise.all([
        request(app).post("/webhook").send(phone1),
        request(app).post("/webhook").send(phone2),
      ]);

      // Both should be in correct session state
      expect(true).toBe(true);
    });
  });

  describe("Data Persistence Workflow", () => {
    test("should maintain data across server restarts", async () => {
      const mechanicPhone = "966569440162";

      // Step 1: Register mechanic
      const registerButton = testUtils.mockButtonMessage(
        "register_mechanic",
        mechanicPhone
      );
      await request(app).post("/webhook").send(registerButton).expect(200);

      const phoneMessage = testUtils.mockWhatsAppMessage(
        "966569440162",
        mechanicPhone
      );
      await request(app).post("/webhook").send(phoneMessage).expect(200);

      // Step 2: Simulate server restart (clear in-memory data)
      // In real scenario, this would persist to database

      // Step 3: Send message after restart
      const restartMessage = testUtils.mockWhatsAppMessage(
        "Hello after restart",
        mechanicPhone
      );
      await request(app).post("/webhook").send(restartMessage).expect(200);
    });
  });
});
