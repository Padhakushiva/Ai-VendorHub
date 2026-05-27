const productCache = require("../services/cache.service");

describe("Product cache service", () => {
  const originalCacheEnabled = process.env.PRODUCT_CACHE_ENABLED;

  beforeEach(async () => {
    process.env.PRODUCT_CACHE_ENABLED = "true";
    await productCache.clear();
  });

  afterAll(async () => {
    if (originalCacheEnabled === undefined) {
      delete process.env.PRODUCT_CACHE_ENABLED;
    } else {
      process.env.PRODUCT_CACHE_ENABLED = originalCacheEnabled;
    }
    await productCache.clear();
  });

  test("should build stable keys from query objects", () => {
    const firstKey = productCache.buildKey("products:list", { sort: "newest", page: "1" });
    const secondKey = productCache.buildKey("products:list", { page: "1", sort: "newest" });

    expect(firstKey).toBe(secondKey);
    expect(firstKey).toMatch(/^products:list:/);
  });

  test("should set and get cached values from memory fallback", async () => {
    const response = {
      success: true,
      data: [{ title: "Laptop", price: { amount: 50000, currency: "INR" } }],
    };

    await productCache.set("products:list:test", response, 60);

    await expect(productCache.get("products:list:test")).resolves.toEqual(response);
  });

  test("should delete exact and prefixed cache keys", async () => {
    await productCache.set("products:list:abc", { data: ["a"] }, 60);
    await productCache.set("products:list:def", { data: ["b"] }, 60);
    await productCache.set("product:123", { data: "detail" }, 60);

    await productCache.del("products:list");

    await expect(productCache.get("products:list:abc")).resolves.toBeNull();
    await expect(productCache.get("products:list:def")).resolves.toBeNull();
    await expect(productCache.get("product:123")).resolves.toEqual({ data: "detail" });
  });

  test("should return null for expired memory entries", async () => {
    await productCache.set("product:expired", { data: "old" }, -1);

    await expect(productCache.get("product:expired")).resolves.toBeNull();
  });

  test("should disable cache reads and writes when explicitly disabled", async () => {
    process.env.PRODUCT_CACHE_ENABLED = "false";

    await productCache.set("product:disabled", { data: "hidden" }, 60);

    await expect(productCache.get("product:disabled")).resolves.toBeNull();
  });
});
