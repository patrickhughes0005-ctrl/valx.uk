import { describe, expect, it } from "vitest";
import { DvlaClient, GoogleMapsClient } from "../src";

describe("mock integrations", () => {
  it("looks up the approved prototype vehicle without network access", async () => {
    const result = await new DvlaClient({ mode: "mock" }).lookup("RE22 CEX");
    expect(result).toMatchObject({
      registrationNumber: "RE22 CEX",
      make: "Land Rover",
      model: "Range Rover Evoque",
      bodyStyle: "SUV",
      source: "mock"
    });
  });

  it("returns a deterministic mock route", async () => {
    const result = await new GoogleMapsClient({ mode: "mock" }).route(
      "origin",
      "destination"
    );
    expect(result).toEqual({
      distanceMetres: 6437,
      durationSeconds: 1080,
      source: "mock"
    });
  });
});
