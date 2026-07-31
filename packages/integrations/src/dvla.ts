export type DvlaMode = "mock" | "live";

export type VehicleDetails = {
  registrationNumber: string;
  make: string;
  model?: string;
  colour: string;
  fuelType: string;
  yearOfManufacture: number;
  bodyStyle?: string;
  engineCapacity?: number;
  motStatus?: string;
  taxStatus?: string;
  source: "dvla" | "mock";
};

export type DvlaClientOptions = {
  mode?: DvlaMode;
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

const mockVehicles: Record<string, Omit<VehicleDetails, "source">> = {
  RE22CEX: {
    registrationNumber: "RE22 CEX",
    make: "Land Rover",
    model: "Range Rover Evoque",
    colour: "Black",
    fuelType: "Diesel",
    yearOfManufacture: 2022,
    bodyStyle: "SUV"
  },
  OX107NP: {
    registrationNumber: "OX10 7NP",
    make: "Tesla",
    model: "Model 3",
    colour: "White",
    fuelType: "Electric",
    yearOfManufacture: 2020,
    bodyStyle: "Saloon"
  },
  FD19STA: {
    registrationNumber: "FD19 STA",
    make: "Ford",
    model: "Fiesta",
    colour: "Blue",
    fuelType: "Petrol",
    yearOfManufacture: 2019,
    bodyStyle: "Hatchback"
  }
};

export const normaliseRegistration = (registration: string) =>
  registration.replace(/[^A-Z0-9]/gi, "").toUpperCase();

export class DvlaClient {
  private readonly mode: DvlaMode;
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: DvlaClientOptions = {}) {
    this.mode = options.mode ?? "mock";
    this.apiKey = options.apiKey;
    this.baseUrl =
      options.baseUrl ??
      "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async lookup(registration: string): Promise<VehicleDetails> {
    const normalised = normaliseRegistration(registration);
    if (normalised.length < 5 || normalised.length > 8) {
      throw new Error("Registration must contain 5 to 8 letters or numbers");
    }

    if (this.mode === "mock") {
      const match = mockVehicles[normalised] ?? {
        registrationNumber: normalised,
        make: "BMW",
        model: "3 Series",
        colour: "Grey",
        fuelType: "Petrol",
        yearOfManufacture: 2021,
        bodyStyle: "Saloon"
      };
      return { ...match, source: "mock" };
    }

    if (!this.apiKey) {
      throw new Error("DVLA_API_KEY is required in live mode");
    }

    const response = await this.fetchImpl(`${this.baseUrl}/vehicles`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey
      },
      body: JSON.stringify({ registrationNumber: normalised })
    });

    if (!response.ok) {
      throw new Error(`DVLA lookup failed with status ${response.status}`);
    }

    const result = (await response.json()) as Omit<VehicleDetails, "source">;
    return { ...result, source: "dvla" };
  }
}

