import { describe, expect, it } from "vitest";
import { isPantheonFactoryConsumerEnabled } from "./consumer.js";

describe("pantheon factory consumer env gate", () => {
  it("is disabled by default", () => {
    expect(isPantheonFactoryConsumerEnabled({})).toBe(false);
  });

  it("is enabled when flag is truthy", () => {
    expect(isPantheonFactoryConsumerEnabled({ PANTHEON_FACTORY_CONSUMER_ENABLED: "1" })).toBe(
      true,
    );
  });
});
