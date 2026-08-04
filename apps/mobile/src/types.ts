import type { ServiceId, VehicleType } from "@valx/pricing-policy";

export type Role = "customer" | "detailer";

export type User = {
  id: string;
  role: Role;
  email: string;
  name: string;
  phone: string | null;
};

export type Vehicle = {
  id: string;
  registrationNumber: string;
  make: string;
  model: string | null;
  type: VehicleType;
};

export type Address = {
  id: string;
  label: string;
  postcode: string;
  waterAvailable: boolean | null;
};

export type Quote = {
  id: string;
  serviceId?: ServiceId;
  predictedMinutes: number;
  jobPrice: number;
  serviceFee: number;
  customerTotal: number;
  detailerEarnings: number;
};

export type Booking = {
  id: string;
  status: string;
  bookingType: string;
  scheduledFor: string | null;
  paymentState: "not_connected";
  serviceId: ServiceId;
  customerTotal: number;
  detailerEarnings: number;
  vehicle: Vehicle;
  address: Address;
  customerName: string;
  detailerName: string | null;
};

export type DetailerDocument = {
  id: string;
  type: "identity" | "public_liability_insurance" | "motor_insurance";
  status: "pending" | "approved" | "rejected";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string | null;
  uploadedAt: string;
  reviewNotes: string | null;
};

export type DetailerOnboarding = {
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  businessName: string | null;
  tradingAddress: string | null;
  operatingPostcode: string | null;
  experienceYears: number | null;
  ownWaterSupply: boolean;
  serviceRadiusMiles: number;
  vatRegistered: boolean;
  vatNumber: string | null;
  instagram: string | null;
  rightToWorkDeclared: boolean;
  termsAccepted: boolean;
  status: "draft" | "submitted" | "changes_requested" | "approved" | "rejected";
  submittedAt: string | null;
  approvedAt: string | null;
  reviewNotes: string | null;
  documents: DetailerDocument[];
};
