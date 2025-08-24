const axios = require("axios");
const {
  sendMessage,
  downloadImage,
  sendTemplateMessageByName,
} = require("../../whatsappService");

// Mock axios
jest.mock("axios");

describe("WhatsAppService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendMessage", () => {
    test("should send text message successfully", async () => {
      const mockResponse = { data: { message_id: "test_message_id" } };
      axios.post.mockResolvedValue(mockResponse);

      await sendMessage("1234567890", "Hello World");

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/messages"),
        {
          messaging_product: "whatsapp",
          to: "1234567890",
          type: "text",
          text: { body: "Hello World" },
        },
        {
          headers: { Authorization: "Bearer test_api_token" },
        }
      );
    });

    test("should send message with buttons", async () => {
      const mockResponse = { data: { message_id: "test_message_id" } };
      axios.post.mockResolvedValue(mockResponse);

      const buttons = [
        {
          type: "reply",
          reply: {
            id: "button1",
            title: "Button 1",
          },
        },
      ];

      await sendMessage("1234567890", "Choose an option", buttons);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/messages"),
        {
          messaging_product: "whatsapp",
          to: "1234567890",
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: "Choose an option" },
            action: {
              buttons: buttons,
            },
          },
        },
        {
          headers: { Authorization: "Bearer test_api_token" },
        }
      );
    });

    test("should handle API errors", async () => {
      const errorResponse = {
        response: {
          data: { error: { message: "Invalid phone number" } },
        },
      };
      axios.post.mockRejectedValue(errorResponse);

      await expect(sendMessage("invalid", "Hello")).rejects.toThrow();
    });

    test("should handle network errors", async () => {
      const networkError = new Error("Network error");
      axios.post.mockRejectedValue(networkError);

      await expect(sendMessage("1234567890", "Hello")).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("downloadImage", () => {
    test("should download image successfully", async () => {
      const mockMetadataResponse = {
        data: {
          url: "https://example.com/image.jpg",
        },
      };

      const mockImageResponse = {
        data: Buffer.from("fake-image-data"),
      };

      axios.get
        .mockResolvedValueOnce(mockMetadataResponse)
        .mockResolvedValueOnce(mockImageResponse);

      const result = await downloadImage("test_image_id");

      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe("fake-image-data");
    });

    test("should handle missing image URL in metadata", async () => {
      const mockMetadataResponse = {
        data: {},
      };

      axios.get.mockResolvedValue(mockMetadataResponse);

      await expect(downloadImage("test_image_id")).rejects.toThrow(
        "Invalid image metadata received"
      );
    });

    test("should handle metadata API errors", async () => {
      const errorResponse = {
        response: {
          data: { error: { message: "Invalid image ID" } },
        },
      };
      axios.get.mockRejectedValue(errorResponse);

      await expect(downloadImage("invalid_id")).rejects.toThrow();
    });

    test("should handle image download errors", async () => {
      const mockMetadataResponse = {
        data: {
          url: "https://example.com/image.jpg",
        },
      };

      const downloadError = new Error("Download failed");
      axios.get
        .mockResolvedValueOnce(mockMetadataResponse)
        .mockRejectedValueOnce(downloadError);

      await expect(downloadImage("test_image_id")).rejects.toThrow(
        "Download failed"
      );
    });
  });

  describe("sendTemplateMessageByName", () => {
    test("should send template message successfully", async () => {
      const mockResponse = { data: { message_id: "test_message_id" } };
      axios.post.mockResolvedValue(mockResponse);

      await sendTemplateMessageByName("1234567890", "test_template", [
        "param1",
        "param2",
      ]);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/messages"),
        expect.objectContaining({
          messaging_product: "whatsapp",
          to: "1234567890",
          type: "template",
          template: expect.objectContaining({
            name: "test_template",
          }),
        }),
        {
          headers: { Authorization: "Bearer test_api_token" },
        }
      );
    });

    test("should throw error for non-existent template", async () => {
      await expect(
        sendTemplateMessageByName("1234567890", "non_existent_template")
      ).rejects.toThrow("Template 'non_existent_template' not found");
    });

    test("should handle template API errors", async () => {
      const errorResponse = {
        response: {
          data: { error: { message: "Template not approved" } },
        },
      };
      axios.post.mockRejectedValue(errorResponse);

      await expect(
        sendTemplateMessageByName("1234567890", "test_template")
      ).rejects.toThrow();
    });
  });

  describe("Error Handling", () => {
    test("should handle axios timeout errors", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.code = "ECONNABORTED";
      axios.post.mockRejectedValue(timeoutError);

      await expect(sendMessage("1234567890", "Hello")).rejects.toThrow(
        "Request timeout"
      );
    });

    test("should handle malformed response data", async () => {
      const mockResponse = { data: null };
      axios.post.mockResolvedValue(mockResponse);

      // This should not throw but log the response
      await expect(sendMessage("1234567890", "Hello")).resolves.not.toThrow();
    });

    test("should handle empty response", async () => {
      const mockResponse = {};
      axios.post.mockResolvedValue(mockResponse);

      await expect(sendMessage("1234567890", "Hello")).resolves.not.toThrow();
    });
  });

  describe("Input Validation", () => {
    test("should handle empty phone number", async () => {
      await expect(sendMessage("", "Hello")).rejects.toThrow();
    });

    test("should handle null phone number", async () => {
      await expect(sendMessage(null, "Hello")).rejects.toThrow();
    });

    test("should handle empty message text", async () => {
      const mockResponse = { data: { message_id: "test_message_id" } };
      axios.post.mockResolvedValue(mockResponse);

      await expect(sendMessage("1234567890", "")).resolves.not.toThrow();
    });

    test("should handle null message text", async () => {
      const mockResponse = { data: { message_id: "test_message_id" } };
      axios.post.mockResolvedValue(mockResponse);

      await expect(sendMessage("1234567890", null)).resolves.not.toThrow();
    });
  });

  describe("Environment Variables", () => {
    test("should use correct API URL and token", async () => {
      const mockResponse = { data: { message_id: "test_message_id" } };
      axios.post.mockResolvedValue(mockResponse);

      await sendMessage("1234567890", "Hello");

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("https://graph.facebook.com/v18.0"),
        expect.any(Object),
        {
          headers: { Authorization: "Bearer test_api_token" },
        }
      );
    });
  });

  describe("Integration Scenarios", () => {
    test("should handle complete message workflow", async () => {
      const mockResponse = { data: { message_id: "test_message_id" } };
      axios.post.mockResolvedValue(mockResponse);

      // Send initial message
      await sendMessage("1234567890", "Welcome!");

      // Send message with buttons
      const buttons = [
        {
          type: "reply",
          reply: {
            id: "option1",
            title: "Option 1",
          },
        },
      ];
      await sendMessage("1234567890", "Choose an option:", buttons);

      // Send template message
      await sendTemplateMessageByName("1234567890", "test_template", [
        "param1",
      ]);

      expect(axios.post).toHaveBeenCalledTimes(3);
    });

    test("should handle image processing workflow", async () => {
      const mockMetadataResponse = {
        data: {
          url: "https://example.com/image.jpg",
        },
      };

      const mockImageResponse = {
        data: Buffer.from("fake-image-data"),
      };

      axios.get
        .mockResolvedValueOnce(mockMetadataResponse)
        .mockResolvedValueOnce(mockImageResponse);

      const imageBuffer = await downloadImage("test_image_id");

      expect(imageBuffer).toBeInstanceOf(Buffer);
      expect(imageBuffer.length).toBeGreaterThan(0);
    });
  });
});
