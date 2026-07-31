export type GoogleMode = "mock" | "live";

export type PlaceSuggestion = {
  placeId: string;
  label: string;
  mainText: string;
  secondaryText: string;
};

export type RouteEstimate = {
  distanceMetres: number;
  durationSeconds: number;
  source: "google" | "mock";
};

export type GoogleMapsClientOptions = {
  mode?: GoogleMode;
  apiKey?: string;
  placesBaseUrl?: string;
  routesBaseUrl?: string;
  fetchImpl?: typeof fetch;
};

export class GoogleMapsClient {
  private readonly mode: GoogleMode;
  private readonly apiKey?: string;
  private readonly placesBaseUrl: string;
  private readonly routesBaseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GoogleMapsClientOptions = {}) {
    this.mode = options.mode ?? "mock";
    this.apiKey = options.apiKey;
    this.placesBaseUrl =
      options.placesBaseUrl ?? "https://places.googleapis.com/v1";
    this.routesBaseUrl =
      options.routesBaseUrl ??
      "https://routes.googleapis.com/directions/v2";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async autocomplete(input: string): Promise<PlaceSuggestion[]> {
    if (input.trim().length < 3) return [];
    if (this.mode === "mock") {
      return [
        {
          placeId: "mock-benson-ox10",
          label: "10 Brook Street, Benson, OX10",
          mainText: "10 Brook Street",
          secondaryText: "Benson, OX10"
        },
        {
          placeId: "mock-wallingford-ox10",
          label: "25 High Street, Wallingford, OX10",
          mainText: "25 High Street",
          secondaryText: "Wallingford, OX10"
        }
      ].filter(({ label }) =>
        label.toLowerCase().includes(input.trim().toLowerCase())
      );
    }

    this.assertLiveKey();
    const response = await this.fetchImpl(
      `${this.placesBaseUrl}/places:autocomplete`,
      {
        method: "POST",
        headers: this.headers("suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat"),
        body: JSON.stringify({
          input,
          includedRegionCodes: ["gb"],
          languageCode: "en-GB"
        })
      }
    );
    if (!response.ok) {
      throw new Error(
        `Google Places autocomplete failed with status ${response.status}`
      );
    }
    const body = (await response.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
        };
      }>;
    };
    return (body.suggestions ?? []).flatMap(({ placePrediction }) =>
      placePrediction?.placeId
        ? [
            {
              placeId: placePrediction.placeId,
              label: placePrediction.text?.text ?? "",
              mainText:
                placePrediction.structuredFormat?.mainText?.text ?? "",
              secondaryText:
                placePrediction.structuredFormat?.secondaryText?.text ?? ""
            }
          ]
        : []
    );
  }

  async route(
    originPlaceId: string,
    destinationPlaceId: string
  ): Promise<RouteEstimate> {
    if (this.mode === "mock") {
      return {
        distanceMetres: 6437,
        durationSeconds: 1080,
        source: "mock"
      };
    }

    this.assertLiveKey();
    const response = await this.fetchImpl(
      `${this.routesBaseUrl}:computeRoutes`,
      {
        method: "POST",
        headers: this.headers("routes.distanceMeters,routes.duration"),
        body: JSON.stringify({
          origin: { placeId: originPlaceId },
          destination: { placeId: destinationPlaceId },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE"
        })
      }
    );
    if (!response.ok) {
      throw new Error(
        `Google Routes lookup failed with status ${response.status}`
      );
    }
    const body = (await response.json()) as {
      routes?: Array<{ distanceMeters?: number; duration?: string }>;
    };
    const route = body.routes?.[0];
    if (!route?.distanceMeters || !route.duration) {
      throw new Error("Google Routes returned no usable route");
    }
    return {
      distanceMetres: route.distanceMeters,
      durationSeconds: Number.parseFloat(route.duration.replace("s", "")),
      source: "google"
    };
  }

  private assertLiveKey() {
    if (!this.apiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY is required in live mode");
    }
  }

  private headers(fieldMask: string) {
    return {
      "content-type": "application/json",
      "x-goog-api-key": this.apiKey ?? "",
      "x-goog-fieldmask": fieldMask
    };
  }
}

