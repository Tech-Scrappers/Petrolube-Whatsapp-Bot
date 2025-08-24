const request = require("supertest");
const express = require("express");
const nock = require("nock");

// Create a test app
const app = express();
app.use(express.json());

// Mock the webhook router
const webhookRouter = require("../../routes/webhook");
app.use(webhookRouter);

describe("Performance and Load Tests", () => {
  beforeEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  afterAll(() => {
    nock.restore();
  });

  describe("Concurrent User Load Tests", () => {
    test("should handle 10 concurrent users", async () => {
      const startTime = Date.now();
      const numUsers = 10;
      const promises = [];

      // Mock WhatsApp API responses
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .times(numUsers)
        .reply(200, { message_id: "test_message_id" });

      for (let i = 0; i < numUsers; i++) {
        const phoneNumber = `96656944016${i}`;
        const message = testUtils.mockWhatsAppMessage(
          `Hello from user ${i}`,
          phoneNumber
        );

        promises.push(request(app).post("/webhook").send(message).expect(200));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Performance assertion: should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
      console.log(`Processed ${numUsers} concurrent users in ${duration}ms`);
    });

    test("should handle 50 concurrent users", async () => {
      const startTime = Date.now();
      const numUsers = 50;
      const promises = [];

      // Mock WhatsApp API responses
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .times(numUsers)
        .reply(200, { message_id: "test_message_id" });

      for (let i = 0; i < numUsers; i++) {
        const phoneNumber = `96656944016${i}`;
        const message = testUtils.mockWhatsAppMessage(
          `Hello from user ${i}`,
          phoneNumber
        );

        promises.push(request(app).post("/webhook").send(message).expect(200));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Performance assertion: should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
      console.log(`Processed ${numUsers} concurrent users in ${duration}ms`);
    });

    test("should handle 100 concurrent users", async () => {
      const startTime = Date.now();
      const numUsers = 100;
      const promises = [];

      // Mock WhatsApp API responses
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .times(numUsers)
        .reply(200, { message_id: "test_message_id" });

      for (let i = 0; i < numUsers; i++) {
        const phoneNumber = `96656944016${i}`;
        const message = testUtils.mockWhatsAppMessage(
          `Hello from user ${i}`,
          phoneNumber
        );

        promises.push(request(app).post("/webhook").send(message).expect(200));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Performance assertion: should complete within 15 seconds
      expect(duration).toBeLessThan(15000);
      console.log(`Processed ${numUsers} concurrent users in ${duration}ms`);
    });
  });

  describe("Message Throughput Tests", () => {
    test("should handle 1000 messages per minute", async () => {
      const startTime = Date.now();
      const numMessages = 1000;
      const promises = [];

      // Mock WhatsApp API responses
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .times(numMessages)
        .reply(200, { message_id: "test_message_id" });

      for (let i = 0; i < numMessages; i++) {
        const phoneNumber = `96656944016${i % 10}`; // Cycle through 10 users
        const message = testUtils.mockWhatsAppMessage(
          `Message ${i}`,
          phoneNumber
        );

        promises.push(request(app).post("/webhook").send(message).expect(200));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Performance assertion: should complete within 60 seconds (1000 messages per minute)
      expect(duration).toBeLessThan(60000);
      const messagesPerSecond = numMessages / (duration / 1000);
      console.log(
        `Processed ${numMessages} messages in ${duration}ms (${messagesPerSecond.toFixed(
          2
        )} msg/sec)`
      );
    });

    test("should handle rapid message bursts", async () => {
      const startTime = Date.now();
      const numBursts = 10;
      const messagesPerBurst = 50;
      const promises = [];

      // Mock WhatsApp API responses
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .times(numBursts * messagesPerBurst)
        .reply(200, { message_id: "test_message_id" });

      for (let burst = 0; burst < numBursts; burst++) {
        for (let i = 0; i < messagesPerBurst; i++) {
          const phoneNumber = `96656944016${i % 5}`; // 5 users per burst
          const message = testUtils.mockWhatsAppMessage(
            `Burst ${burst} Message ${i}`,
            phoneNumber
          );

          promises.push(
            request(app).post("/webhook").send(message).expect(200)
          );
        }
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Performance assertion: should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
      console.log(
        `Processed ${
          numBursts * messagesPerBurst
        } burst messages in ${duration}ms`
      );
    });
  });

  describe("Session Management Performance", () => {
    test("should handle multiple sessions efficiently", async () => {
      const startTime = Date.now();
      const numSessions = 100;
      const messagesPerSession = 5;
      const promises = [];

      // Mock WhatsApp API responses
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .times(numSessions * messagesPerSession)
        .reply(200, { message_id: "test_message_id" });

      for (let session = 0; session < numSessions; session++) {
        const phoneNumber = `96656944016${session % 10}`;

        // Simulate a conversation flow for each session
        for (let msg = 0; msg < messagesPerSession; msg++) {
          const message = testUtils.mockWhatsAppMessage(
            `Session ${session} Message ${msg}`,
            phoneNumber
          );
          promises.push(
            request(app).post("/webhook").send(message).expect(200)
          );
        }
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Performance assertion: should complete within 20 seconds
      expect(duration).toBeLessThan(20000);
      console.log(
        `Processed ${
          numSessions * messagesPerSession
        } session messages in ${duration}ms`
      );
    });

    test("should handle session cleanup efficiently", async () => {
      const startTime = Date.now();
      const numSessions = 50;
      const promises = [];

      // Mock WhatsApp API responses
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .times(numSessions * 2) // Initial message + cleanup message
        .reply(200, { message_id: "test_message_id" });

      // Create sessions
      for (let i = 0; i < numSessions; i++) {
        const phoneNumber = `96656944016${i}`;
        const message = testUtils.mockWhatsAppMessage(
          `Create session ${i}`,
          phoneNumber
        );
        promises.push(request(app).post("/webhook").send(message).expect(200));
      }

      // Wait for sessions to be created
      await Promise.all(promises);

      // Simulate session cleanup (inactivity timeout)
      const cleanupPromises = [];
      for (let i = 0; i < numSessions; i++) {
        const phoneNumber = `96656944016${i}`;
        const message = testUtils.mockWhatsAppMessage(
          `Cleanup session ${i}`,
          phoneNumber
        );
        cleanupPromises.push(
          request(app).post("/webhook").send(message).expect(200)
        );
      }

      const cleanupResults = await Promise.all(cleanupPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All cleanup requests should succeed
      cleanupResults.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Performance assertion: should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
      console.log(
        `Processed session cleanup for ${numSessions} sessions in ${duration}ms`
      );
    });
  });

  describe("External API Performance", () => {
    test("should handle external API delays gracefully", async () => {
      const startTime = Date.now();
      const numRequests = 20;
      const promises = [];

      // Mock external API with delays
      nock("http://localhost:3001")
        .post("/validate-mechanic")
        .times(numRequests)
        .delay(100) // 100ms delay
        .reply(200, {
          success: true,
          mechanic: {
            id: "mechanic123",
            name: "Test Mechanic",
            phone: "966569440162",
          },
        });

      for (let i = 0; i < numRequests; i++) {
        const phoneNumber = `96656944016${i % 5}`;
        const message = testUtils.mockWhatsAppMessage(
          `Validate mechanic ${i}`,
          phoneNumber
        );
        promises.push(request(app).post("/webhook").send(message).expect(200));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Performance assertion: should complete within 5 seconds (including API delays)
      expect(duration).toBeLessThan(5000);
      console.log(
        `Processed ${numRequests} external API requests in ${duration}ms`
      );
    });

    test("should handle external API timeouts", async () => {
      const startTime = Date.now();
      const numRequests = 10;
      const promises = [];

      // Mock external API with timeouts
      nock("http://localhost:3001")
        .post("/validate-mechanic")
        .times(numRequests)
        .delay(5000) // 5 second delay (timeout)
        .reply(200, {
          success: true,
          mechanic: {
            id: "mechanic123",
            name: "Test Mechanic",
            phone: "966569440162",
          },
        });

      for (let i = 0; i < numRequests; i++) {
        const phoneNumber = `96656944016${i}`;
        const message = testUtils.mockWhatsAppMessage(
          `Timeout test ${i}`,
          phoneNumber
        );
        promises.push(request(app).post("/webhook").send(message).expect(200));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed (even with timeouts)
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      console.log(`Processed ${numRequests} timeout requests in ${duration}ms`);
    });
  });

  describe("Memory Usage Tests", () => {
    test("should maintain stable memory usage under load", async () => {
      const initialMemory = process.memoryUsage();
      const numRequests = 1000;
      const promises = [];

      // Mock WhatsApp API responses
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .times(numRequests)
        .reply(200, { message_id: "test_message_id" });

      for (let i = 0; i < numRequests; i++) {
        const phoneNumber = `96656944016${i % 10}`;
        const message = testUtils.mockWhatsAppMessage(
          `Memory test ${i}`,
          phoneNumber
        );
        promises.push(request(app).post("/webhook").send(message).expect(200));
      }

      const results = await Promise.all(promises);
      const finalMemory = process.memoryUsage();

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Memory usage should not increase dramatically
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`Memory usage: ${memoryIncreaseMB.toFixed(2)}MB increase`);
      expect(memoryIncreaseMB).toBeLessThan(100); // Should not increase by more than 100MB
    });
  });

  describe("Response Time Tests", () => {
    test("should maintain consistent response times", async () => {
      const numRequests = 100;
      const responseTimes = [];

      // Mock WhatsApp API responses
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .times(numRequests)
        .reply(200, { message_id: "test_message_id" });

      for (let i = 0; i < numRequests; i++) {
        const phoneNumber = `96656944016${i % 5}`;
        const message = testUtils.mockWhatsAppMessage(
          `Response time test ${i}`,
          phoneNumber
        );

        const startTime = Date.now();
        const response = await request(app)
          .post("/webhook")
          .send(message)
          .expect(200);
        const endTime = Date.now();

        responseTimes.push(endTime - startTime);
      }

      // Calculate statistics
      const avgResponseTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      console.log(
        `Response times - Avg: ${avgResponseTime.toFixed(
          2
        )}ms, Min: ${minResponseTime}ms, Max: ${maxResponseTime}ms`
      );

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(1000); // Average response time < 1 second
      expect(maxResponseTime).toBeLessThan(5000); // Max response time < 5 seconds
    });

    test("should handle image processing response times", async () => {
      const numRequests = 20;
      const responseTimes = [];

      // Mock image download and OpenAI API
      nock("https://graph.facebook.com")
        .get(/\/.*\/test_image_id/)
        .times(numRequests)
        .reply(200, { url: "https://example.com/image.jpg" });

      nock("https://example.com")
        .get("/image.jpg")
        .times(numRequests)
        .reply(200, Buffer.from("fake-image-data"));

      nock("https://api.openai.com")
        .post("/v1/chat/completions")
        .times(numRequests)
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

      for (let i = 0; i < numRequests; i++) {
        const phoneNumber = `96656944016${i % 5}`;
        const message = testUtils.mockImageMessage(phoneNumber);

        const startTime = Date.now();
        const response = await request(app)
          .post("/webhook")
          .send(message)
          .expect(200);
        const endTime = Date.now();

        responseTimes.push(endTime - startTime);
      }

      // Calculate statistics
      const avgResponseTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      console.log(
        `Image processing response times - Avg: ${avgResponseTime.toFixed(
          2
        )}ms, Max: ${maxResponseTime}ms`
      );

      // Performance assertions for image processing
      expect(avgResponseTime).toBeLessThan(3000); // Average response time < 3 seconds
      expect(maxResponseTime).toBeLessThan(10000); // Max response time < 10 seconds
    });
  });

  describe("Error Handling Performance", () => {
    test("should handle high error rates gracefully", async () => {
      const startTime = Date.now();
      const numRequests = 100;
      const promises = [];

      // Mock WhatsApp API with 50% error rate
      nock("https://graph.facebook.com")
        .post(/\/.*\/messages/)
        .times(numRequests)
        .reply((uri, requestBody) => {
          // Simulate 50% error rate
          if (Math.random() < 0.5) {
            return [500, { error: "Internal server error" }];
          }
          return [200, { message_id: "test_message_id" }];
        });

      for (let i = 0; i < numRequests; i++) {
        const phoneNumber = `96656944016${i % 5}`;
        const message = testUtils.mockWhatsAppMessage(
          `Error test ${i}`,
          phoneNumber
        );
        promises.push(
          request(app).post("/webhook").send(message).expect(200) // Should still return 200 even if WhatsApp API fails
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed (error handling should be graceful)
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Performance assertion: should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
      console.log(
        `Processed ${numRequests} requests with 50% error rate in ${duration}ms`
      );
    });
  });
});
