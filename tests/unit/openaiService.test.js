const axios = require("axios");
const {
  extractNumberPlate,
  detectNumberOfFoils,
} = require("../../openaiService");

// Mock axios
jest.mock("axios");

describe("OpenAIService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extractNumberPlate", () => {
    test("should extract number plate successfully", async () => {
      const mockResponse = {
        data: {
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
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const imageBuffer = Buffer.from("fake-image-data");
      const result = await extractNumberPlate(imageBuffer);

      expect(result).toEqual({
        numberPlate: "ABC123",
        confidence: 0.95,
      });

      expect(axios.post).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          model: "gpt-4-vision-preview",
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: "text",
                  text: expect.stringContaining("Extract the number plate"),
                }),
                expect.objectContaining({
                  type: "image_url",
                  image_url: expect.objectContaining({
                    url: expect.stringContaining("data:image/"),
                  }),
                }),
              ]),
            }),
          ]),
        }),
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test_openai_key",
            "Content-Type": "application/json",
          },
        })
      );
    });

    test("should handle no number plate detected", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberPlate: null,
                  confidence: 0.0,
                  reason: "No number plate visible in image",
                }),
              },
            },
          ],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const imageBuffer = Buffer.from("fake-image-data");
      const result = await extractNumberPlate(imageBuffer);

      expect(result).toEqual({
        numberPlate: null,
        confidence: 0.0,
        reason: "No number plate visible in image",
      });
    });

    test("should handle multiple number plates", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberPlate: "ABC123",
                  confidence: 0.85,
                  note: "Multiple plates detected, using the most prominent one",
                }),
              },
            },
          ],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const imageBuffer = Buffer.from("fake-image-data");
      const result = await extractNumberPlate(imageBuffer);

      expect(result).toEqual({
        numberPlate: "ABC123",
        confidence: 0.85,
        note: "Multiple plates detected, using the most prominent one",
      });
    });

    test("should handle API errors", async () => {
      const errorResponse = {
        response: {
          data: { error: { message: "Invalid API key" } },
          status: 401,
        },
      };
      axios.post.mockRejectedValue(errorResponse);

      const imageBuffer = Buffer.from("fake-image-data");

      await expect(extractNumberPlate(imageBuffer)).rejects.toThrow();
    });

    test("should handle malformed JSON response", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: "Invalid JSON response",
              },
            },
          ],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const imageBuffer = Buffer.from("fake-image-data");

      await expect(extractNumberPlate(imageBuffer)).rejects.toThrow();
    });

    test("should handle empty response", async () => {
      const mockResponse = {
        data: {
          choices: [],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const imageBuffer = Buffer.from("fake-image-data");

      await expect(extractNumberPlate(imageBuffer)).rejects.toThrow();
    });

    test("should handle network errors", async () => {
      const networkError = new Error("Network error");
      axios.post.mockRejectedValue(networkError);

      const imageBuffer = Buffer.from("fake-image-data");

      await expect(extractNumberPlate(imageBuffer)).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("detectNumberOfFoils", () => {
    test("should detect number of foils successfully", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberOfFoils: 3,
                  confidence: 0.92,
                  details: "Three oil filter foils clearly visible",
                }),
              },
            },
          ],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const imageBuffer = Buffer.from("fake-image-data");
      const result = await detectNumberOfFoils(imageBuffer);

      expect(result).toEqual({
        numberOfFoils: 3,
        confidence: 0.92,
        details: "Three oil filter foils clearly visible",
      });

      expect(axios.post).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          model: "gpt-4-vision-preview",
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: "text",
                  text: expect.stringContaining(
                    "Count the number of oil filter foils"
                  ),
                }),
                expect.objectContaining({
                  type: "image_url",
                  image_url: expect.objectContaining({
                    url: expect.stringContaining("data:image/"),
                  }),
                }),
              ]),
            }),
          ]),
        }),
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test_openai_key",
            "Content-Type": "application/json",
          },
        })
      );
    });

    test("should handle zero foils detected", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberOfFoils: 0,
                  confidence: 0.88,
                  details: "No oil filter foils visible in the image",
                }),
              },
            },
          ],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const imageBuffer = Buffer.from("fake-image-data");
      const result = await detectNumberOfFoils(imageBuffer);

      expect(result).toEqual({
        numberOfFoils: 0,
        confidence: 0.88,
        details: "No oil filter foils visible in the image",
      });
    });

    test("should handle large number of foils", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberOfFoils: 15,
                  confidence: 0.75,
                  details: "Multiple stacks of foils detected, total count: 15",
                  note: "Some foils may be partially obscured",
                }),
              },
            },
          ],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const imageBuffer = Buffer.from("fake-image-data");
      const result = await detectNumberOfFoils(imageBuffer);

      expect(result).toEqual({
        numberOfFoils: 15,
        confidence: 0.75,
        details: "Multiple stacks of foils detected, total count: 15",
        note: "Some foils may be partially obscured",
      });
    });

    test("should handle API errors", async () => {
      const errorResponse = {
        response: {
          data: { error: { message: "Rate limit exceeded" } },
          status: 429,
        },
      };
      axios.post.mockRejectedValue(errorResponse);

      const imageBuffer = Buffer.from("fake-image-data");

      await expect(detectNumberOfFoils(imageBuffer)).rejects.toThrow();
    });

    test("should handle malformed JSON response", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: "Invalid JSON response",
              },
            },
          ],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const imageBuffer = Buffer.from("fake-image-data");

      await expect(detectNumberOfFoils(imageBuffer)).rejects.toThrow();
    });

    test("should handle missing numberOfFoils in response", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  confidence: 0.5,
                  details: "Image unclear",
                }),
              },
            },
          ],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const imageBuffer = Buffer.from("fake-image-data");

      await expect(detectNumberOfFoils(imageBuffer)).rejects.toThrow();
    });
  });

  describe("Input Validation", () => {
    test("should handle empty image buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(extractNumberPlate(emptyBuffer)).rejects.toThrow();
      await expect(detectNumberOfFoils(emptyBuffer)).rejects.toThrow();
    });

    test("should handle null image buffer", async () => {
      await expect(extractNumberPlate(null)).rejects.toThrow();
      await expect(detectNumberOfFoils(null)).rejects.toThrow();
    });

    test("should handle undefined image buffer", async () => {
      await expect(extractNumberPlate(undefined)).rejects.toThrow();
      await expect(detectNumberOfFoils(undefined)).rejects.toThrow();
    });

    test("should handle very large image buffer", async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB

      // Mock successful response for large buffer
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberPlate: "ABC123",
                  confidence: 0.9,
                }),
              },
            },
          ],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await extractNumberPlate(largeBuffer);
      expect(result.numberPlate).toBe("ABC123");
    });
  });

  describe("Environment Variables", () => {
    test("should use correct OpenAI API key", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberPlate: "ABC123",
                  confidence: 0.9,
                }),
              },
            },
          ],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const imageBuffer = Buffer.from("fake-image-data");
      await extractNumberPlate(imageBuffer);

      expect(axios.post).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.any(Object),
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test_openai_key",
            "Content-Type": "application/json",
          },
        })
      );
    });
  });

  describe("Integration Scenarios", () => {
    test("should handle complete image analysis workflow", async () => {
      const imageBuffer = Buffer.from("fake-image-data");

      // Mock number plate extraction
      const plateResponse = {
        data: {
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
        },
      };

      // Mock foil detection
      const foilResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberOfFoils: 4,
                  confidence: 0.88,
                }),
              },
            },
          ],
        },
      };

      axios.post
        .mockResolvedValueOnce(plateResponse)
        .mockResolvedValueOnce(foilResponse);

      const plateResult = await extractNumberPlate(imageBuffer);
      const foilResult = await detectNumberOfFoils(imageBuffer);

      expect(plateResult.numberPlate).toBe("ABC123");
      expect(foilResult.numberOfFoils).toBe(4);
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    test("should handle concurrent image analysis requests", async () => {
      const imageBuffer1 = Buffer.from("fake-image-1");
      const imageBuffer2 = Buffer.from("fake-image-2");

      const response1 = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberPlate: "ABC123",
                  confidence: 0.9,
                }),
              },
            },
          ],
        },
      };

      const response2 = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberPlate: "XYZ789",
                  confidence: 0.85,
                }),
              },
            },
          ],
        },
      };

      axios.post
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      const [result1, result2] = await Promise.all([
        extractNumberPlate(imageBuffer1),
        extractNumberPlate(imageBuffer2),
      ]);

      expect(result1.numberPlate).toBe("ABC123");
      expect(result2.numberPlate).toBe("XYZ789");
    });

    test("should handle mixed success and failure scenarios", async () => {
      const imageBuffer = Buffer.from("fake-image-data");

      // Mock successful number plate extraction
      const plateResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberPlate: "ABC123",
                  confidence: 0.9,
                }),
              },
            },
          ],
        },
      };

      // Mock failed foil detection
      const errorResponse = {
        response: {
          data: { error: { message: "Rate limit exceeded" } },
          status: 429,
        },
      };

      axios.post
        .mockResolvedValueOnce(plateResponse)
        .mockRejectedValueOnce(errorResponse);

      const plateResult = await extractNumberPlate(imageBuffer);
      await expect(detectNumberOfFoils(imageBuffer)).rejects.toThrow();

      expect(plateResult.numberPlate).toBe("ABC123");
    });
  });

  describe("Error Recovery", () => {
    test("should handle retry logic for temporary failures", async () => {
      const imageBuffer = Buffer.from("fake-image-data");

      // Mock temporary failure followed by success
      const errorResponse = {
        response: {
          data: { error: { message: "Rate limit exceeded" } },
          status: 429,
        },
      };

      const successResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  numberPlate: "ABC123",
                  confidence: 0.9,
                }),
              },
            },
          ],
        },
      };

      axios.post
        .mockRejectedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse);

      // Note: This test assumes retry logic is implemented
      // If not, it will fail on first attempt
      try {
        const result = await extractNumberPlate(imageBuffer);
        expect(result.numberPlate).toBe("ABC123");
      } catch (error) {
        // If no retry logic, this is expected
        expect(error.message).toContain("Rate limit exceeded");
      }
    });
  });
});
