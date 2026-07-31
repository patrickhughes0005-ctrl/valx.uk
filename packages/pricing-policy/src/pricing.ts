export type VehicleType =
  | "hatchback"
  | "sedan"
  | "suv"
  | "coupe"
  | "pickup"
  | "other";

export type ServiceId =
  | "exterior-detail"
  | "exterior-interior"
  | "deep-detail"
  | "premium-full-detail";

export type ServiceDefinition = {
  id: ServiceId;
  name: string;
  baseMinutes: number;
  basePrice: number;
  note: string;
  features: readonly string[];
  popular?: boolean;
};

export const SERVICE_FEE = 3.99;
export const FAST_TRACK_PREMIUM = 2;
export const INCLUDED_TRAVEL_MILES = 3;
export const EXTRA_TRAVEL_PER_MILE = 1.1;
export const AFFILIATE_FIRST_SERVICE_DISCOUNT_RATE = 0.1;
export const VALX_JOB_MARGIN_RATE = 0.2;

export const services: readonly ServiceDefinition[] = [
  {
    id: "exterior-detail",
    name: "Exterior Detail",
    baseMinutes: 60,
    basePrice: 40,
    note: "A careful exterior refresh",
    features: ["Hand wash", "Wheels cleaned", "Tyres dressed"]
  },
  {
    id: "exterior-interior",
    name: "Exterior + Interior",
    baseMinutes: 90,
    basePrice: 70,
    note: "Our everyday complete clean",
    features: ["Full exterior", "Interior vacuum", "Surfaces cleaned"],
    popular: true
  },
  {
    id: "deep-detail",
    name: "Deep Detail",
    baseMinutes: 210,
    basePrice: 120,
    note: "A deep reset, inside and out",
    features: ["Deep interior", "Paint protection", "Detailed finish"]
  },
  {
    id: "premium-full-detail",
    name: "Premium Full Detail",
    baseMinutes: 300,
    basePrice: 175,
    note: "Our most comprehensive restoration detail",
    features: ["Deep clean", "Decontamination", "Premium protection"]
  }
] as const;

export const vehiclePricing: Record<
  VehicleType,
  { priceMultiplier: number; timeMultiplier: number }
> = {
  hatchback: { priceMultiplier: 1, timeMultiplier: 1 },
  sedan: { priceMultiplier: 1.05, timeMultiplier: 1.05 },
  coupe: { priceMultiplier: 1.05, timeMultiplier: 1.05 },
  suv: { priceMultiplier: 1.15, timeMultiplier: 1.15 },
  pickup: { priceMultiplier: 1.2, timeMultiplier: 1.2 },
  other: { priceMultiplier: 1.1, timeMultiplier: 1.1 }
};

export type QuoteInput = {
  serviceId: ServiceId;
  vehicleType: VehicleType;
  distanceMiles: number;
  affiliateFirstService?: boolean;
  fastTrack?: boolean;
};

export type Quote = {
  currency: "GBP";
  basePrice: number;
  predictedMinutes: number;
  vehicleAdjustment: number;
  travelAdjustment: number;
  fastTrackAdjustment: number;
  affiliateDiscount: number;
  jobPrice: number;
  valxJobMargin: number;
  detailerEarnings: number;
  serviceFee: number;
  customerTotal: number;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function calculateQuote(input: QuoteInput): Quote {
  const service = services.find(({ id }) => id === input.serviceId);
  if (!service) throw new Error(`Unknown service: ${input.serviceId}`);
  if (!Number.isFinite(input.distanceMiles) || input.distanceMiles < 0) {
    throw new Error("distanceMiles must be a non-negative number");
  }

  const vehicleRule = vehiclePricing[input.vehicleType];
  const predictedMinutes =
    Math.ceil((service.baseMinutes * vehicleRule.timeMultiplier) / 5) * 5;
  const vehicleAdjustment = roundMoney(
    service.basePrice * (vehicleRule.priceMultiplier - 1)
  );
  const travelAdjustment = roundMoney(
    Math.max(0, input.distanceMiles - INCLUDED_TRAVEL_MILES) *
      EXTRA_TRAVEL_PER_MILE
  );
  const fastTrackAdjustment = input.fastTrack ? FAST_TRACK_PREMIUM : 0;
  const undiscountedJobPrice = roundMoney(
    service.basePrice +
      vehicleAdjustment +
      travelAdjustment +
      fastTrackAdjustment
  );
  const affiliateDiscount = input.affiliateFirstService
    ? roundMoney(
        undiscountedJobPrice * AFFILIATE_FIRST_SERVICE_DISCOUNT_RATE
      )
    : 0;
  const jobPrice = roundMoney(undiscountedJobPrice - affiliateDiscount);
  const valxJobMargin = roundMoney(jobPrice * VALX_JOB_MARGIN_RATE);
  const detailerEarnings = roundMoney(jobPrice - valxJobMargin);

  return {
    currency: "GBP",
    basePrice: service.basePrice,
    predictedMinutes,
    vehicleAdjustment,
    travelAdjustment,
    fastTrackAdjustment,
    affiliateDiscount,
    jobPrice,
    valxJobMargin,
    detailerEarnings,
    serviceFee: SERVICE_FEE,
    customerTotal: roundMoney(jobPrice + SERVICE_FEE)
  };
}

