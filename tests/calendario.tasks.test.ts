import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const chain = {
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  get: vi.fn(),
};

const collection = vi.fn(() => chain);

vi.mock("@/server/firebase", () => ({
  adminDb: {
    collection,
  },
}));

describe("Calendario / getTasksWithKPIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.get.mockReset();
    collection.mockClear();
  });

  it("expone el error de credenciales ausentes cuando Firestore falla", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const missingCredentialsError = new Error(
      "Missing Firebase Admin credentials. Define GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_IMPERSONATE_SERVICE_ACCOUNT."
    );

    chain.get.mockRejectedValueOnce(missingCredentialsError);

    const { getTasksWithKPIs } = await import("@/features/tasks/actions");
    const result = await getTasksWithKPIs("user-test-123");

    expect(result.tasks).toEqual([]);
    expect(result.kpis.total).toBe(0);

    expect(consoleSpy).toHaveBeenCalledWith(
      "[getTasksWithKPIs] Error:",
      missingCredentialsError
    );

    consoleSpy.mockRestore();
  });
});
