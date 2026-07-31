import { describe, expect, it } from "vitest";
import {
  calculateQuote,
  SERVICE_FEE,
  VALX_JOB_MARGIN_RATE
} from "../src";

describe("ValX approved pricing", () => {
  it("prices the prototype default hatchback job", () => {
    expect(
      calculateQuote({
        serviceId: "exterior-interior",
        vehicleType: "hatchback",
        distanceMiles: 1.8
      })
    ).toMatchObject({
      jobPrice: 70,
      valxJobMargin: 14,
      detailerEarnings: 56,
      serviceFee: 3.99,
      customerTotal: 73.99
    });
  });

  it("applies vehicle, travel, fast-track, and affiliate rules in order", () => {
    expect(
      calculateQuote({
        serviceId: "deep-detail",
        vehicleType: "suv",
        distanceMiles: 4.2,
        fastTrack: true,
        affiliateFirstService: true
      })
    ).toEqual({
      currency: "GBP",
      basePrice: 120,
      predictedMinutes: 245,
      vehicleAdjustment: 18,
      travelAdjustment: 1.32,
      fastTrackAdjustment: 2,
      affiliateDiscount: 14.13,
      jobPrice: 127.19,
      valxJobMargin: 25.44,
      detailerEarnings: 101.75,
      serviceFee: SERVICE_FEE,
      customerTotal: 131.18
    });
  });

  it("keeps detailer earnings equal to the displayed job pay", () => {
    const quote = calculateQuote({
      serviceId: "premium-full-detail",
      vehicleType: "pickup",
      distanceMiles: 5.2
    });
    expect(quote.valxJobMargin).toBeCloseTo(
      quote.jobPrice * VALX_JOB_MARGIN_RATE,
      2
    );
    expect(quote.detailerEarnings + quote.valxJobMargin).toBe(
      quote.jobPrice
    );
  });
});
