const sessionManager = require("../../sessionManager");

describe("SessionManager", () => {
  beforeEach(() => {
    // Clear all data before each test
    sessionManager.mechanicSessions.clear();
    sessionManager.customerConfirmations.clear();
    sessionManager.mechanicWallets.clear();
    sessionManager.oilChangeLogs.clear();
    sessionManager.customerToLog.clear();
    sessionManager.processedMessageIds.clear();
    sessionManager.inactivityTimers.clear();
  });

  describe("Session Management", () => {
    test("should return default session for new sender", () => {
      const session = sessionManager.getSession("1234567890");
      expect(session).toEqual({ state: "menu", data: {} });
    });

    test("should set and get session correctly", () => {
      const testSession = {
        state: "collecting_phone",
        data: { tempPhone: "1234567890" },
      };
      sessionManager.setSession("1234567890", testSession);

      const retrievedSession = sessionManager.getSession("1234567890");
      expect(retrievedSession).toEqual(testSession);
    });

    test("should maintain separate sessions for different senders", () => {
      const session1 = { state: "menu", data: {} };
      const session2 = { state: "collecting_phone", data: {} };

      sessionManager.setSession("sender1", session1);
      sessionManager.setSession("sender2", session2);

      expect(sessionManager.getSession("sender1")).toEqual(session1);
      expect(sessionManager.getSession("sender2")).toEqual(session2);
    });
  });

  describe("Wallet Management", () => {
    test("should return 0 for new mechanic wallet", () => {
      const wallet = sessionManager.getWallet("mechanic123");
      expect(wallet).toBe(0);
    });

    test("should set and get wallet amount correctly", () => {
      sessionManager.setWallet("mechanic123", 150);
      const wallet = sessionManager.getWallet("mechanic123");
      expect(wallet).toBe(150);
    });

    test("should check if wallet exists", () => {
      expect(sessionManager.hasWallet("mechanic123")).toBe(false);

      sessionManager.setWallet("mechanic123", 100);
      expect(sessionManager.hasWallet("mechanic123")).toBe(true);
    });

    test("should update existing wallet amount", () => {
      sessionManager.setWallet("mechanic123", 100);
      sessionManager.setWallet("mechanic123", 250);

      const wallet = sessionManager.getWallet("mechanic123");
      expect(wallet).toBe(250);
    });
  });

  describe("Oil Change Log Management", () => {
    test("should add and retrieve oil change log", () => {
      const logEntry = {
        id: "log123",
        mechanicId: "mechanic123",
        customerPhone: "1234567890",
        timestamp: new Date().toISOString(),
        oilType: "Synthetic",
        quantity: 4,
      };

      sessionManager.addOilChangeLog("log123", logEntry);
      const retrievedLog = sessionManager.getOilChangeLogByKey("log123");

      expect(retrievedLog).toEqual(logEntry);
    });

    test("should return all oil change logs", () => {
      const log1 = {
        id: "log1",
        mechanicId: "mechanic1",
        customerPhone: "1234567890",
      };
      const log2 = {
        id: "log2",
        mechanicId: "mechanic2",
        customerPhone: "0987654321",
      };

      sessionManager.addOilChangeLog("log1", log1);
      sessionManager.addOilChangeLog("log2", log2);

      const allLogs = sessionManager.getOilChangeLogs();
      expect(allLogs).toHaveLength(2);
      expect(allLogs).toContainEqual(log1);
      expect(allLogs).toContainEqual(log2);
    });

    test("should filter logs by mechanic ID", () => {
      const log1 = {
        id: "log1",
        mechanicId: "mechanic1",
        customerPhone: "1234567890",
      };
      const log2 = {
        id: "log2",
        mechanicId: "mechanic1",
        customerPhone: "0987654321",
      };
      const log3 = {
        id: "log3",
        mechanicId: "mechanic2",
        customerPhone: "5555555555",
      };

      sessionManager.addOilChangeLog("log1", log1);
      sessionManager.addOilChangeLog("log2", log2);
      sessionManager.addOilChangeLog("log3", log3);

      const mechanic1Logs =
        sessionManager.getOilChangeLogsByMechanic("mechanic1");
      expect(mechanic1Logs).toHaveLength(2);
      expect(mechanic1Logs).toContainEqual(log1);
      expect(mechanic1Logs).toContainEqual(log2);
    });

    test("should return empty array for non-existent mechanic", () => {
      const logs = sessionManager.getOilChangeLogsByMechanic("nonexistent");
      expect(logs).toEqual([]);
    });
  });

  describe("Customer to Log Mapping", () => {
    test("should set and get customer to log mapping", () => {
      sessionManager.setCustomerToLog("1234567890", "log123");
      const logId = sessionManager.getCustomerToLog("1234567890");
      expect(logId).toBe("log123");
    });

    test("should return undefined for non-existent customer", () => {
      const logId = sessionManager.getCustomerToLog("nonexistent");
      expect(logId).toBeUndefined();
    });
  });

  describe("Message Processing", () => {
    test("should track processed messages", () => {
      const messageId = "msg123";

      expect(sessionManager.isMessageProcessed(messageId)).toBe(false);

      sessionManager.markMessageProcessed(messageId);
      expect(sessionManager.isMessageProcessed(messageId)).toBe(true);
    });

    test("should handle duplicate message processing", () => {
      const messageId = "msg123";

      sessionManager.markMessageProcessed(messageId);
      sessionManager.markMessageProcessed(messageId); // Duplicate

      expect(sessionManager.isMessageProcessed(messageId)).toBe(true);
    });
  });

  describe("Inactivity Timer Management", () => {
    test("should set and clear inactivity timer", () => {
      const sender = "1234567890";
      const callback = jest.fn();

      sessionManager.setInactivityTimer(sender, callback, 100);
      expect(sessionManager.hasInactivityTimer(sender)).toBe(true);

      sessionManager.clearInactivityTimer(sender);
      expect(sessionManager.hasInactivityTimer(sender)).toBe(false);
    });

    test("should clear existing timer when setting new one", () => {
      const sender = "1234567890";
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      sessionManager.setInactivityTimer(sender, callback1, 100);
      sessionManager.setInactivityTimer(sender, callback2, 100);

      expect(sessionManager.hasInactivityTimer(sender)).toBe(true);
    });

    test("should execute callback after timeout", (done) => {
      const sender = "1234567890";
      const callback = jest.fn(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        expect(sessionManager.hasInactivityTimer(sender)).toBe(false);
        done();
      });

      sessionManager.setInactivityTimer(sender, callback, 50);
    }, 1000);
  });

  describe("Data Persistence", () => {
    test("should maintain data across multiple operations", () => {
      // Set up complex state
      sessionManager.setSession("sender1", {
        state: "collecting_phone",
        data: { tempPhone: "123" },
      });
      sessionManager.setWallet("mechanic1", 150);
      sessionManager.addOilChangeLog("log1", {
        id: "log1",
        mechanicId: "mechanic1",
      });
      sessionManager.setCustomerToLog("1234567890", "log1");
      sessionManager.markMessageProcessed("msg1");

      // Verify all data is maintained
      expect(sessionManager.getSession("sender1")).toEqual({
        state: "collecting_phone",
        data: { tempPhone: "123" },
      });
      expect(sessionManager.getWallet("mechanic1")).toBe(150);
      expect(sessionManager.getOilChangeLogByKey("log1")).toEqual({
        id: "log1",
        mechanicId: "mechanic1",
      });
      expect(sessionManager.getCustomerToLog("1234567890")).toBe("log1");
      expect(sessionManager.isMessageProcessed("msg1")).toBe(true);
    });
  });
});
