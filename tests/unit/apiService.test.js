const axios = require("axios");
const {
  validateMechanicByPhone,
  validateQRCodes,
  validateCustomer,
  updateMechanicWallet,
  fetchLeaderboard,
  fetchMechanicWallet,
} = require("../../apiService");

// Mock axios
jest.mock("axios");

describe("ApiService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateMechanicByPhone", () => {
    test("should validate mechanic successfully", async () => {
      const mockResponse = {
        data: {
          success: true,
          mechanic: {
            id: "mechanic123",
            name: "John Doe",
            phone: "966569440162",
            shop_name: "Test Shop",
          },
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validateMechanicByPhone("966569440162");

      expect(result).toEqual({
        success: true,
        mechanic: {
          id: "mechanic123",
          name: "John Doe",
          phone: "966569440162",
          shop_name: "Test Shop",
        },
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/validate-mechanic"),
        { phone: "966569440162" },
        expect.any(Object)
      );
    });

    test("should handle invalid mechanic", async () => {
      const mockResponse = {
        data: {
          success: false,
          message: "Mechanic not found",
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validateMechanicByPhone("invalid_phone");

      expect(result).toEqual({
        success: false,
        message: "Mechanic not found",
      });
    });

    test("should handle API errors", async () => {
      const errorResponse = {
        response: {
          data: { error: "Internal server error" },
          status: 500,
        },
      };
      axios.post.mockRejectedValue(errorResponse);

      await expect(validateMechanicByPhone("966569440162")).rejects.toThrow();
    });

    test("should handle network errors", async () => {
      const networkError = new Error("Network error");
      axios.post.mockRejectedValue(networkError);

      await expect(validateMechanicByPhone("966569440162")).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("validateQRCodes", () => {
    test("should validate QR codes successfully", async () => {
      const mockResponse = {
        data: {
          success: true,
          validCodes: ["QR001", "QR002"],
          invalidCodes: [],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const qrCodes = ["QR001", "QR002"];
      const result = await validateQRCodes(qrCodes);

      expect(result).toEqual({
        success: true,
        validCodes: ["QR001", "QR002"],
        invalidCodes: [],
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/validate-qr-codes"),
        { qrCodes },
        expect.any(Object)
      );
    });

    test("should handle invalid QR codes", async () => {
      const mockResponse = {
        data: {
          success: true,
          validCodes: ["QR001"],
          invalidCodes: ["INVALID_QR"],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const qrCodes = ["QR001", "INVALID_QR"];
      const result = await validateQRCodes(qrCodes);

      expect(result).toEqual({
        success: true,
        validCodes: ["QR001"],
        invalidCodes: ["INVALID_QR"],
      });
    });

    test("should handle empty QR codes array", async () => {
      const mockResponse = {
        data: {
          success: true,
          validCodes: [],
          invalidCodes: [],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validateQRCodes([]);

      expect(result).toEqual({
        success: true,
        validCodes: [],
        invalidCodes: [],
      });
    });

    test("should handle API errors", async () => {
      const errorResponse = {
        response: {
          data: { error: "Invalid QR codes format" },
          status: 400,
        },
      };
      axios.post.mockRejectedValue(errorResponse);

      await expect(validateQRCodes(["QR001"])).rejects.toThrow();
    });
  });

  describe("validateCustomer", () => {
    test("should validate customer successfully", async () => {
      const mockResponse = {
        data: {
          success: true,
          customer: {
            id: "customer123",
            name: "Jane Doe",
            phone: "966569440162",
            vehicle_info: {
              make: "Toyota",
              model: "Camry",
              year: "2020",
            },
          },
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const customerData = {
        phone: "966569440162",
        name: "Jane Doe",
        vehicle_info: {
          make: "Toyota",
          model: "Camry",
          year: "2020",
        },
      };

      const result = await validateCustomer(customerData);

      expect(result).toEqual({
        success: true,
        customer: {
          id: "customer123",
          name: "Jane Doe",
          phone: "966569440162",
          vehicle_info: {
            make: "Toyota",
            model: "Camry",
            year: "2020",
          },
        },
      });
    });

    test("should handle invalid customer data", async () => {
      const mockResponse = {
        data: {
          success: false,
          message: "Customer validation failed",
          errors: ["Invalid phone number", "Missing vehicle information"],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const customerData = {
        phone: "invalid_phone",
        name: "Jane Doe",
      };

      const result = await validateCustomer(customerData);

      expect(result).toEqual({
        success: false,
        message: "Customer validation failed",
        errors: ["Invalid phone number", "Missing vehicle information"],
      });
    });

    test("should handle API errors", async () => {
      const errorResponse = {
        response: {
          data: { error: "Customer service unavailable" },
          status: 503,
        },
      };
      axios.post.mockRejectedValue(errorResponse);

      const customerData = { phone: "966569440162", name: "Jane Doe" };

      await expect(validateCustomer(customerData)).rejects.toThrow();
    });
  });

  describe("updateMechanicWallet", () => {
    test("should update mechanic wallet successfully", async () => {
      const mockResponse = {
        data: {
          success: true,
          newBalance: 250,
          transaction: {
            id: "txn123",
            amount: 100,
            type: "credit",
            timestamp: "2024-01-01T00:00:00Z",
          },
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await updateMechanicWallet("mechanic123", 100, "credit");

      expect(result).toEqual({
        success: true,
        newBalance: 250,
        transaction: {
          id: "txn123",
          amount: 100,
          type: "credit",
          timestamp: "2024-01-01T00:00:00Z",
        },
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/update-wallet"),
        {
          mechanicId: "mechanic123",
          amount: 100,
          type: "credit",
        },
        expect.any(Object)
      );
    });

    test("should handle insufficient balance", async () => {
      const mockResponse = {
        data: {
          success: false,
          message: "Insufficient balance",
          currentBalance: 50,
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await updateMechanicWallet("mechanic123", 100, "debit");

      expect(result).toEqual({
        success: false,
        message: "Insufficient balance",
        currentBalance: 50,
      });
    });

    test("should handle invalid transaction type", async () => {
      const mockResponse = {
        data: {
          success: false,
          message: "Invalid transaction type",
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await updateMechanicWallet(
        "mechanic123",
        100,
        "invalid_type"
      );

      expect(result).toEqual({
        success: false,
        message: "Invalid transaction type",
      });
    });

    test("should handle API errors", async () => {
      const errorResponse = {
        response: {
          data: { error: "Wallet service error" },
          status: 500,
        },
      };
      axios.post.mockRejectedValue(errorResponse);

      await expect(
        updateMechanicWallet("mechanic123", 100, "credit")
      ).rejects.toThrow();
    });
  });

  describe("fetchLeaderboard", () => {
    test("should fetch leaderboard successfully", async () => {
      const mockResponse = {
        data: {
          success: true,
          leaderboard: [
            {
              rank: 1,
              mechanicId: "mechanic1",
              name: "John Doe",
              shop_name: "Shop 1",
              points: 1500,
              oilChanges: 25,
            },
            {
              rank: 2,
              mechanicId: "mechanic2",
              name: "Jane Smith",
              shop_name: "Shop 2",
              points: 1200,
              oilChanges: 20,
            },
          ],
          totalParticipants: 2,
        },
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchLeaderboard();

      expect(result).toEqual({
        success: true,
        leaderboard: [
          {
            rank: 1,
            mechanicId: "mechanic1",
            name: "John Doe",
            shop_name: "Shop 1",
            points: 1500,
            oilChanges: 25,
          },
          {
            rank: 2,
            mechanicId: "mechanic2",
            name: "Jane Smith",
            shop_name: "Shop 2",
            points: 1200,
            oilChanges: 20,
          },
        ],
        totalParticipants: 2,
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/leaderboard"),
        expect.any(Object)
      );
    });

    test("should handle empty leaderboard", async () => {
      const mockResponse = {
        data: {
          success: true,
          leaderboard: [],
          totalParticipants: 0,
        },
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchLeaderboard();

      expect(result).toEqual({
        success: true,
        leaderboard: [],
        totalParticipants: 0,
      });
    });

    test("should handle API errors", async () => {
      const errorResponse = {
        response: {
          data: { error: "Leaderboard service unavailable" },
          status: 503,
        },
      };
      axios.get.mockRejectedValue(errorResponse);

      await expect(fetchLeaderboard()).rejects.toThrow();
    });
  });

  describe("fetchMechanicWallet", () => {
    test("should fetch mechanic wallet successfully", async () => {
      const mockResponse = {
        data: {
          success: true,
          wallet: {
            mechanicId: "mechanic123",
            balance: 500,
            currency: "SAR",
            lastUpdated: "2024-01-01T00:00:00Z",
          },
        },
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchMechanicWallet("mechanic123");

      expect(result).toEqual({
        success: true,
        wallet: {
          mechanicId: "mechanic123",
          balance: 500,
          currency: "SAR",
          lastUpdated: "2024-01-01T00:00:00Z",
        },
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/wallet/mechanic123"),
        expect.any(Object)
      );
    });

    test("should handle mechanic not found", async () => {
      const mockResponse = {
        data: {
          success: false,
          message: "Mechanic not found",
        },
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchMechanicWallet("nonexistent_mechanic");

      expect(result).toEqual({
        success: false,
        message: "Mechanic not found",
      });
    });

    test("should handle API errors", async () => {
      const errorResponse = {
        response: {
          data: { error: "Wallet service error" },
          status: 500,
        },
      };
      axios.get.mockRejectedValue(errorResponse);

      await expect(fetchMechanicWallet("mechanic123")).rejects.toThrow();
    });
  });

  describe("Error Handling", () => {
    test("should handle timeout errors", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.code = "ECONNABORTED";
      axios.post.mockRejectedValue(timeoutError);

      await expect(validateMechanicByPhone("966569440162")).rejects.toThrow(
        "Request timeout"
      );
    });

    test("should handle malformed response data", async () => {
      const mockResponse = { data: null };
      axios.post.mockResolvedValue(mockResponse);

      await expect(validateMechanicByPhone("966569440162")).rejects.toThrow();
    });

    test("should handle empty response", async () => {
      const mockResponse = {};
      axios.post.mockResolvedValue(mockResponse);

      await expect(validateMechanicByPhone("966569440162")).rejects.toThrow();
    });
  });

  describe("Input Validation", () => {
    test("should handle empty phone number", async () => {
      await expect(validateMechanicByPhone("")).rejects.toThrow();
    });

    test("should handle null phone number", async () => {
      await expect(validateMechanicByPhone(null)).rejects.toThrow();
    });

    test("should handle empty QR codes array", async () => {
      const mockResponse = {
        data: {
          success: true,
          validCodes: [],
          invalidCodes: [],
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validateQRCodes([]);
      expect(result.success).toBe(true);
    });

    test("should handle null customer data", async () => {
      await expect(validateCustomer(null)).rejects.toThrow();
    });
  });

  describe("Integration Scenarios", () => {
    test("should handle complete mechanic validation workflow", async () => {
      // Mock mechanic validation
      const mechanicResponse = {
        data: {
          success: true,
          mechanic: {
            id: "mechanic123",
            name: "John Doe",
            phone: "966569440162",
          },
        },
      };

      // Mock wallet fetch
      const walletResponse = {
        data: {
          success: true,
          wallet: {
            mechanicId: "mechanic123",
            balance: 500,
          },
        },
      };

      axios.post.mockResolvedValueOnce(mechanicResponse);
      axios.get.mockResolvedValueOnce(walletResponse);

      const mechanic = await validateMechanicByPhone("966569440162");
      const wallet = await fetchMechanicWallet("mechanic123");

      expect(mechanic.success).toBe(true);
      expect(wallet.success).toBe(true);
      expect(mechanic.mechanic.id).toBe(wallet.wallet.mechanicId);
    });

    test("should handle QR code validation workflow", async () => {
      const qrCodes = ["QR001", "QR002", "QR003"];

      // Mock QR validation
      const qrResponse = {
        data: {
          success: true,
          validCodes: ["QR001", "QR002"],
          invalidCodes: ["QR003"],
        },
      };

      axios.post.mockResolvedValue(qrResponse);

      const result = await validateQRCodes(qrCodes);

      expect(result.success).toBe(true);
      expect(result.validCodes).toHaveLength(2);
      expect(result.invalidCodes).toHaveLength(1);
    });
  });
});
