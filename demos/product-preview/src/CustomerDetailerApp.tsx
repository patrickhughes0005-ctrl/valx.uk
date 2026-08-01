"use client";

import { useEffect, useRef, useState } from "react";

type Tab = "garage" | "services" | "history" | "account";
type Flow = null | "service" | "browse" | "profile" | "plan" | "method" | "priority" | "prebook" | "matching" | "review" | "complete";
type Mode = "Priority Pick" | "Next Available" | "Prebook";
type Sheet = null | "vehicles" | "addresses";
type Role = "customer" | "detailer" | "admin";
type VehicleType = "hatchback" | "sedan" | "suv" | "coupe" | "pickup" | "other";
type Vehicle = { name: string; reg: string; detail: string; bodyType: VehicleType };

// The public product preview is deliberately self-contained. The production
// applications use the shared API; this static demo must never depend on it.
const ENABLE_LIVE_MARKETPLACE_SYNC = false;
type Address = { label: string; full: string; postcode: string; confirmed: boolean };
type DetailerTab = "jobs" | "schedule" | "activity" | "rewards" | "account";
type JobStage = "available" | "navigating" | "arrival" | "before" | "working" | "after" | "complete";
type BookingStatus = "scheduled" | "on-way" | "arrived";
type CustomerEdit = null | "name" | "email" | "phone" | "payment" | "notifications" | "support";
type DetailerEdit = null | "name" | "email" | "phone" | "water" | "radius" | "instagram" | "vat";
type PaymentKind = "Bank account" | "Apple Pay" | "Google Pay" | "PayPal";
type BankDetails = { accountName: string; sortCode: string; accountNumber: string };
type AuthForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  affiliate: string;
  instagram: string;
  ownWater: boolean;
  bankName: string;
  sortCode: string;
  accountNumber: string;
  vatRegistered: boolean;
  vatNumber: string;
};
type DetailerJob = {
  id: number;
  bodyType: VehicleType;
  car: string;
  type: string;
  payout: number;
  distance: string;
  location: string;
  eta: string;
  specialistOnly: boolean;
  water: boolean;
  top: string;
  left: string;
};
type CustomerBooking = {
  date: string;
  time: string;
  car: string;
  reg: string;
  service: string;
  location: string;
  mode: Mode;
  payout: number;
};
type ScheduleBooking = {
  id: string;
  time: string;
  car: string;
  reg: string;
  service: string;
  location: string;
  payout: number;
  duration: string;
  customer: string;
};
type DetailerJobRecord = {
  booking: ScheduleBooking;
  dateLabel: string;
  completed: boolean;
  beforePhotos: string[];
  afterPhotos: string[];
  blemishSummary: string;
};

const ADDRESS_SUGGESTIONS: Address[] = [
  { label: "Demo service address", full: "Address chosen by the customer", postcode: "OX1 1XX", confirmed: true },
  { label: "Second demo location", full: "Another customer-selected address", postcode: "OX2 2XX", confirmed: true },
  { label: "Oxford demo area", full: "Customer location hidden in this preview", postcode: "OX3 3XX", confirmed: true },
  { label: "Partner demo area", full: "Customer location hidden in this preview", postcode: "OX4 4XX", confirmed: true },
];

const VEHICLE_IMAGES: Record<VehicleType, string> = {
  hatchback: "/vehicles/hatchback-silhouette.png",
  sedan: "/vehicles/sedan-silhouette.png",
  suv: "/vehicles/suv-silhouette.png",
  coupe: "/vehicles/coupe-silhouette.png",
  pickup: "/vehicles/pickup-silhouette.png",
  other: "/vehicles/sedan-silhouette.png",
};

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  hatchback: "Hatchback",
  sedan: "Sedan",
  suv: "SUV",
  coupe: "Coupe",
  pickup: "Pickup truck",
  other: "Other",
};

const VEHICLE_TYPE_OPTIONS: VehicleType[] = ["hatchback", "sedan", "suv", "coupe", "pickup", "other"];
const CUSTOMER_SUPPORT_EMAIL = "customer-support@mygarage-prototype.example";
const DETAILER_SUPPORT_EMAIL = "detailer-support@mygarage-prototype.example";

type VehicleLookupRecord = {
  registrationNumber: string;
  make: string;
  model: string;
  colour: string;
  fuelType: string;
  yearOfManufacture: number;
  bodyStyle: string;
};

function normalizeVehicleType(bodyStyle: string, makeAndModel = ""): VehicleType {
  const value = `${bodyStyle} ${makeAndModel}`.toLowerCase();
  if (/(pick[\s-]?up|pickup|double cab|ranger|hilux|amarok)/.test(value)) return "pickup";
  if (/(coupe|coupé|two door|2 door)/.test(value)) return "coupe";
  if (/(sport utility|suv|crossover|4x4|range rover|evoque|xc40|q5|model y)/.test(value)) return "suv";
  if (/(hatchback|hatch|fiesta|golf|mini cooper|a class)/.test(value)) return "hatchback";
  return "sedan";
}

function vehicleFromLookup(record: VehicleLookupRecord): Vehicle {
  const bodyType = normalizeVehicleType(record.bodyStyle, `${record.make} ${record.model}`);
  return {
    name: `${record.make} ${record.model}`,
    reg: record.registrationNumber,
    detail: `${record.colour} · ${record.fuelType} · ${record.yearOfManufacture} · ${VEHICLE_TYPE_LABELS[bodyType]}`,
    bodyType,
  };
}

const MOCK_VEHICLE_LOOKUPS: Record<string, VehicleLookupRecord> = {
  RE22CEX: { registrationNumber: "RE22 CEX", make: "Land Rover", model: "Range Rover Evoque", colour: "Black", fuelType: "Diesel", yearOfManufacture: 2022, bodyStyle: "SUV" },
  OX107NP: { registrationNumber: "OX10 7NP", make: "Tesla", model: "Model 3", colour: "White", fuelType: "Electric", yearOfManufacture: 2020, bodyStyle: "Saloon" },
  FD19STA: { registrationNumber: "FD19 STA", make: "Ford", model: "Fiesta", colour: "Blue", fuelType: "Petrol", yearOfManufacture: 2019, bodyStyle: "Hatchback" },
  CP21TWO: { registrationNumber: "CP21 TWO", make: "BMW", model: "2 Series", colour: "Grey", fuelType: "Petrol", yearOfManufacture: 2021, bodyStyle: "Coupe" },
  PK24TRK: { registrationNumber: "PK24 TRK", make: "Ford", model: "Ranger", colour: "Silver", fuelType: "Diesel", yearOfManufacture: 2024, bodyStyle: "Double cab pickup" },
};

const SERVICE_FEE = 3.99;
const FAST_TRACK_PREMIUM = 2;
const INCLUDED_TRAVEL_MILES = 3;
const EXTRA_TRAVEL_PER_MILE = 1.1;

type ServiceDefinition = {
  name: string;
  time: string;
  baseMinutes: number;
  basePrice: number;
  note: string;
  features: string;
  icon: string;
  popular?: boolean;
};

const SERVICES: ServiceDefinition[] = [
  { name: "Exterior Detail", time: "Around 60 min", baseMinutes: 60, basePrice: 40, note: "A careful exterior refresh", features: "Hand wash · Wheels cleaned · Tyres dressed", icon: "✦" },
  { name: "Exterior + Interior", time: "Around 90 min", baseMinutes: 90, basePrice: 70, note: "Our everyday complete clean", features: "Full exterior · Interior vacuum · Surfaces cleaned", icon: "◈", popular: true },
  { name: "Deep Detail", time: "3–4 hours", baseMinutes: 210, basePrice: 120, note: "A deep reset, inside and out", features: "Deep interior · Paint protection · Detailed finish", icon: "✺" },
  { name: "Premium Full Detail", time: "5+ hours", baseMinutes: 300, basePrice: 175, note: "Our most comprehensive restoration detail", features: "Deep clean · Decontamination · Premium protection", icon: "✧" },
];

const VALETERS = [
  { name: "Jordan M.", rating: "4.96", reviews: "218", distance: "1.8 mi", jobs: "560+ details", initials: "JM", tone: "sage", bio: "Mobile detailer specialising in careful hand washing and immaculate interiors.", badges: ["Top rated", "Eco products"], reviewText: "Brilliant finish and really professional. My car looked brand new.", times: ["10:30", "12:00", "14:30"], specialist: true },
  { name: "Callum R.", rating: "4.91", reviews: "174", distance: "3.1 mi", jobs: "410+ details", initials: "CR", tone: "stone", bio: "Reliable local detailer offering straightforward, high-quality driveway cleans.", badges: ["Great value", "Fast response"], reviewText: "Arrived on time, explained everything and did a fantastic job.", times: ["11:15", "13:45", "16:00"], specialist: false },
  { name: "Aisha K.", rating: "4.98", reviews: "302", distance: "4.2 mi", jobs: "720+ details", initials: "AK", tone: "plum", bio: "Detail-focused professional known for deep interior work and premium finishes.", badges: ["Customer favourite", "Detail specialist"], reviewText: "The attention to detail was exceptional. Easily the best detail I have booked.", times: ["09:30", "12:30", "15:15"], specialist: true },
];

const VEHICLE_PRICING: Record<VehicleType, { priceMultiplier: number; timeMultiplier: number }> = {
  hatchback: { priceMultiplier: 1, timeMultiplier: 1 },
  sedan: { priceMultiplier: 1.05, timeMultiplier: 1.05 },
  coupe: { priceMultiplier: 1.05, timeMultiplier: 1.05 },
  suv: { priceMultiplier: 1.15, timeMultiplier: 1.15 },
  pickup: { priceMultiplier: 1.2, timeMultiplier: 1.2 },
  other: { priceMultiplier: 1.1, timeMultiplier: 1.1 },
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function distanceMiles(value: string | number) {
  return typeof value === "number" ? value : Number.parseFloat(value) || 0;
}

function calculateQuote(
  service: ServiceDefinition,
  bodyType: VehicleType,
  distance: string | number,
  options: { affiliate?: boolean; fastTrack?: boolean } = {},
) {
  const vehicleRule = VEHICLE_PRICING[bodyType];
  const predictedMinutes = Math.ceil((service.baseMinutes * vehicleRule.timeMultiplier) / 5) * 5;
  const vehicleAdjustment = roundMoney(service.basePrice * (vehicleRule.priceMultiplier - 1));
  const travelAdjustment = roundMoney(Math.max(0, distanceMiles(distance) - INCLUDED_TRAVEL_MILES) * EXTRA_TRAVEL_PER_MILE);
  const subtotalBeforeSpeed = roundMoney(service.basePrice + vehicleAdjustment + travelAdjustment);
  const fastTrackAdjustment = options.fastTrack ? FAST_TRACK_PREMIUM : 0;
  const undiscountedJobPrice = roundMoney(subtotalBeforeSpeed + fastTrackAdjustment);
  const affiliateDiscount = options.affiliate ? roundMoney(undiscountedJobPrice * 0.1) : 0;
  const jobPrice = roundMoney(undiscountedJobPrice - affiliateDiscount);
  const detailJobMargin = roundMoney(jobPrice * 0.2);
  const detailerEarnings = roundMoney(jobPrice - detailJobMargin);
  return {
    basePrice: service.basePrice,
    predictedMinutes,
    vehicleAdjustment,
    travelAdjustment,
    fastTrackAdjustment,
    affiliateDiscount,
    jobPrice,
    detailJobMargin,
    detailerEarnings,
    serviceFee: SERVICE_FEE,
    customerTotal: roundMoney(jobPrice + SERVICE_FEE),
  };
}

const DETAILER_JOBS: DetailerJob[] = [
  { id: 1, bodyType: "sedan", car: "Tesla Model 3", type: "Exterior + Interior", payout: 58, distance: "1.8 mi", location: "Oxford demo area", eta: "6 min", specialistOnly: true, water: false, top: "22%", left: "56%" },
  { id: 2, bodyType: "suv", car: "Range Rover Evoque", type: "Deep Detail", payout: 96, distance: "3.1 mi", location: "Wallingford · OX10", eta: "11 min", specialistOnly: false, water: true, top: "47%", left: "22%" },
  { id: 3, bodyType: "coupe", car: "BMW 2 Series", type: "Exterior Detail", payout: 34, distance: "4.4 mi", location: "Wheatley · OX33", eta: "16 min", specialistOnly: false, water: true, top: "61%", left: "68%" },
  { id: 4, bodyType: "pickup", car: "Ford Ranger", type: "Premium Full Detail", payout: 108, distance: "5.2 mi", location: "Headington · OX3", eta: "18 min", specialistOnly: true, water: false, top: "16%", left: "16%" },
  { id: 5, bodyType: "hatchback", car: "Ford Fiesta", type: "Exterior Detail", payout: 34, distance: "2.6 mi", location: "Cowley · OX4", eta: "9 min", specialistOnly: false, water: true, top: "69%", left: "39%" },
];

const SCHEDULE_BOOKINGS: Record<string, ScheduleBooking[]> = {
  "2026-03-12": [
    { id: "mar12-a", time: "10:00", car: "Ford Fiesta", reg: "FD19 STA", service: "Exterior Detail", location: "Didcot · OX11", payout: 34, duration: "1 hour", customer: "Emily R." },
  ],
  "2026-04-07": [
    { id: "apr07-a", time: "09:30", car: "BMW X1", reg: "BX21 ONE", service: "Exterior + Interior", location: "Abingdon · OX14", payout: 58, duration: "1 hr 30 min", customer: "Tom W." },
  ],
  "2026-04-18": [
    { id: "apr18-a", time: "13:00", car: "Mercedes C Class", reg: "MC20 CLS", service: "Deep Detail", location: "Oxford · OX1", payout: 94, duration: "3 hr 30 min", customer: "Nadia P." },
  ],
  "2026-05-05": [
    { id: "may05-a", time: "11:30", car: "Mini Cooper", reg: "MN20 CPR", service: "Exterior Detail", location: "Kidlington · OX5", payout: 35, duration: "1 hour", customer: "Lewis B." },
  ],
  "2026-06-21": [
    { id: "jun21-a", time: "14:15", car: "Range Rover Evoque", reg: "RE22 CEX", service: "Exterior Detail", location: "Oxford demo area", payout: 40, duration: "1 hour", customer: "Alex M." },
  ],
  "2026-07-28": [
    { id: "jul28-a", time: "09:30", car: "Audi Q5", reg: "OU22 VNX", service: "Deep Detail", location: "Headington · OX3", payout: 94, duration: "3 hr 30 min", customer: "Sophie L." },
    { id: "jul28-b", time: "14:00", car: "VW Golf", reg: "OX19 GFF", service: "Exterior Detail", location: "Cowley · OX4", payout: 36, duration: "1 hour", customer: "Daniel P." },
  ],
  "2026-07-29": [
    { id: "jul29-a", time: "10:00", car: "Range Rover Evoque", reg: "RE22 CEX", service: "Deep Detail", location: "Wallingford · OX10", payout: 96, duration: "3 hr 30 min", customer: "Marcus T." },
    { id: "jul29-b", time: "14:30", car: "Tesla Model 3", reg: "OX10 7NP", service: "Exterior + Interior", location: "Oxford demo area", payout: 58, duration: "1 hr 30 min", customer: "Alex M." },
  ],
  "2026-07-31": [
    { id: "jul31-a", time: "11:00", car: "BMW 3 Series", reg: "OX21 BMW", service: "Exterior Detail", location: "Wheatley · OX33", payout: 34, duration: "1 hour", customer: "Alex H." },
  ],
  "2026-08-03": [
    { id: "aug03-a", time: "09:30", car: "Mercedes A Class", reg: "KM23 MRC", service: "Exterior + Interior", location: "Oxford · OX1", payout: 62, duration: "1 hr 30 min", customer: "Jamie C." },
    { id: "aug03-b", time: "13:00", car: "Volvo XC40", reg: "VX24 KLM", service: "Deep Detail", location: "Abingdon · OX14", payout: 98, duration: "3 hr 30 min", customer: "Priya S." },
    { id: "aug03-c", time: "16:30", car: "Mini Cooper", reg: "MN20 CPR", service: "Exterior Detail", location: "Kidlington · OX5", payout: 35, duration: "1 hour", customer: "Lewis B." },
  ],
  "2026-08-05": [
    { id: "aug05-a", time: "12:00", car: "Tesla Model Y", reg: "TY25 EVS", service: "Deep Detail", location: "Didcot · OX11", payout: 102, duration: "3 hr 30 min", customer: "Hannah W." },
  ],
};

const ACTIVITY_BOOKINGS: DetailerJobRecord[] = [
  {
    booking: { id: "activity-today", time: "10:00", car: "Tesla Model 3", reg: "OX10 7NP", service: "Exterior + Interior", location: "Oxford demo area", payout: 58, duration: "1 hr 30 min", customer: "Alex M." },
    dateLabel: "29 July 2026 · 10:00",
    completed: true,
    beforePhotos: ["Front condition", "Rear condition", "Driver side"],
    afterPhotos: ["Finished front", "Finished rear", "Interior finish"],
    blemishSummary: "2 minor blemishes photographed before work",
  },
  {
    booking: { id: "activity-yesterday", time: "09:30", car: "Audi Q5", reg: "OU22 VNX", service: "Deep Detail", location: "Headington · OX3", payout: 94, duration: "3 hr 30 min", customer: "Sophie L." },
    dateLabel: "28 July 2026 · 09:30",
    completed: true,
    beforePhotos: ["Front condition", "Rear condition", "Passenger side"],
    afterPhotos: ["Finished front", "Finished rear", "Cabin finish"],
    blemishSummary: "No pre-existing blemishes recorded",
  },
  {
    booking: { id: "activity-jul26", time: "14:00", car: "VW Golf", reg: "OX19 GFF", service: "Exterior Detail", location: "Cowley · OX4", payout: 36, duration: "1 hour", customer: "Daniel P." },
    dateLabel: "26 July 2026 · 14:00",
    completed: true,
    beforePhotos: ["Front condition", "Rear condition", "Driver side"],
    afterPhotos: ["Finished front", "Finished rear", "Wheel finish"],
    blemishSummary: "1 wheel blemish photographed before work",
  },
];

export default function Home({
  initialRole,
}: {
  initialRole: Exclude<Role, "admin">;
}) {
  const [authenticated, setAuthenticated] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role | null>(initialRole);
  const [sessionRole, setSessionRole] = useState<Role | null>(initialRole);
  const [profile, setProfile] = useState({ name: "Alex Morgan", email: "demo@valx.uk", phone: "07700 900123", instagram: "@alex.details" });
  const [authForm, setAuthForm] = useState<AuthForm>({ name: "", email: "", phone: "", password: "", affiliate: "", instagram: "", ownWater: true, bankName: "", sortCode: "", accountNumber: "", vatRegistered: false, vatNumber: "" });
  const [authError, setAuthError] = useState("");
  const [showWaterConsent, setShowWaterConsent] = useState(false);
  const [customerWater, setCustomerWater] = useState<boolean | null>(true);
  const [affiliateApplied, setAffiliateApplied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentKind>("Bank account");
  const [customerBank, setCustomerBank] = useState<BankDetails>({ accountName: "Alex Morgan", sortCode: "00-00-00", accountNumber: "00000000" });
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [marketingNotifications, setMarketingNotifications] = useState(false);
  const [supportPreference, setSupportPreference] = useState("Email support preferred");
  const [customerEdit, setCustomerEdit] = useState<CustomerEdit>(null);
  const [tab, setTab] = useState<Tab>("services");
  const [flow, setFlow] = useState<Flow>(null);
  const [fastTrackEntry, setFastTrackEntry] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { name: "Tesla Model 3", reg: "OX10 7NP", detail: "Pearl white · Sedan", bodyType: "sedan" },
    { name: "Range Rover Evoque", reg: "RE22 CEX", detail: "Santorini black · SUV", bodyType: "suv" },
  ]);
  const [addresses, setAddresses] = useState<Address[]>([
    ADDRESS_SUGGESTIONS[0],
    ADDRESS_SUGGESTIONS[1],
  ]);
  const [vehicle, setVehicle] = useState(0);
  const [address, setAddress] = useState(0);
  const [service, setService] = useState(1);
  const [mode, setMode] = useState<Mode>("Next Available");
  const [valeter, setValeter] = useState(0);
  const [date, setDate] = useState("Today");
  const [time, setTime] = useState("12:00");
  const [matched, setMatched] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("scheduled");
  const [bookingEta, setBookingEta] = useState(18);
  const [historyDetail, setHistoryDetail] = useState<null | "upcoming" | "july" | "june">(null);
  const [documentView, setDocumentView] = useState<null | "customer">(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [newReg, setNewReg] = useState("");
  const [lookupState, setLookupState] = useState<"idle" | "checking" | "found" | "error">("idle");
  const [foundVehicle, setFoundVehicle] = useState<Vehicle | null>(null);
  const [chosenVehicleType, setChosenVehicleType] = useState<VehicleType | "">("");
  const [addressQuery, setAddressQuery] = useState("");
  const [draftAddress, setDraftAddress] = useState<Address | null>(null);
  const [lockedQuote, setLockedQuote] = useState<ReturnType<typeof calculateQuote> | null>(null);
  const [confirmedQuote, setConfirmedQuote] = useState<ReturnType<typeof calculateQuote> | null>(null);
  const [showPolicies, setShowPolicies] = useState(false);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".customer-shell");
    const resetShellPosition = () => {
      if (!shell) return;
      shell.scrollTop = 0;
      shell.scrollLeft = 0;
    };

    resetShellPosition();
    const frame = window.requestAnimationFrame(resetShellPosition);
    return () => window.cancelAnimationFrame(frame);
  }, [flow, matched, sheet, tab]);

  const car = vehicles[Math.min(vehicle, vehicles.length - 1)];
  const clean = SERVICES[service];
  const marketValeters = VALETERS;
  const pro = marketValeters[valeter];
  const liveQuote = calculateQuote(clean, car.bodyType, pro.distance, { affiliate: affiliateApplied, fastTrack: mode === "Next Available" });
  const selectedQuote = lockedQuote ?? liveQuote;
  const selectedPrice = selectedQuote.customerTotal;
  const discountedPrice = selectedQuote.jobPrice;
  const detailerEarnings = selectedQuote.detailerEarnings;
  const availableValeters = customerWater === false ? marketValeters.filter((person) => person.specialist) : marketValeters;
  const confirmBooking = () => {
    const finalQuote = lockedQuote ?? liveQuote;
    if (!lockedQuote) setLockedQuote(finalQuote);
    setConfirmedQuote(finalQuote);
    setBooked(true);
    if (mode === "Next Available") {
      setBookingStatus("on-way");
      setBookingEta(18);
    } else {
      setBookingStatus("scheduled");
    }
    setFlow("complete");
  };

  const closeFlow = () => { setFlow(null); setMatched(false); setFastTrackEntry(false); setLockedQuote(null); };
  const openLockedReview = () => {
    setLockedQuote(liveQuote);
    setFlow("review");
  };
  const changeBookingVehicle = (index: number) => {
    setVehicle(index);
    setLockedQuote(null);
    setSheet(null);
    if (flow === "review") setFlow("plan");
  };
  const back = () => {
    if (flow === "service") closeFlow();
    else if (flow === "browse") setFlow("method");
    else if (flow === "profile") setFlow("browse");
    else if (flow === "plan") closeFlow();
    else if (flow === "method") setFlow("plan");
    else if (flow === "priority") setFlow("browse");
    else if (["prebook", "matching"].includes(flow || "")) { setFlow("method"); setMatched(false); }
    else if (flow === "review") setFlow(mode === "Priority Pick" ? "priority" : mode === "Prebook" ? "prebook" : "matching");
    else closeFlow();
  };
  const chooseMode = (next: Mode) => {
    setMode(next);
    setFlow(next === "Priority Pick" ? "browse" : next === "Prebook" ? "prebook" : "matching");
  };
  const submitAuth = () => {
    if (!role) {
      setAuthError("Choose Customer or Detailer before continuing.");
      return;
    }
    const selectedRole = role;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authForm.email);
    if (selectedRole === "admin") {
      if (!emailOk || !authForm.password) {
        setAuthError("Enter an approved admin email and password to continue.");
        return;
      }
      window.location.assign("https://my-garage-admin.reecetomo.chatgpt.site");
      return;
    }
    const phoneOk = /^[+\d][\d\s()-]{8,}$/.test(authForm.phone);
    const detailerBankOk = selectedRole !== "detailer" || authMode !== "signup" || (
      authForm.bankName.trim().length > 2 &&
      authForm.sortCode.replace(/\D/g, "").length === 6 &&
      authForm.accountNumber.replace(/\D/g, "").length === 8
    );
    const vatOk = selectedRole !== "detailer" || authMode !== "signup" || !authForm.vatRegistered || /^[A-Z]{0,2}\d{9,12}$/i.test(authForm.vatNumber.replace(/\s/g, ""));
    if (!emailOk || !authForm.password || (authMode === "signup" && (!authForm.name.trim() || !phoneOk)) || !detailerBankOk || !vatOk) {
      setAuthError(!detailerBankOk ? "Enter the account holder, 6-digit sort code and 8-digit account number for instant payouts." : !vatOk ? "Enter a valid VAT registration number." : authMode === "signup" ? "Enter your name, a valid email, phone number and password." : "Enter a valid email and password.");
      return;
    }
    setProfile({
      name: authMode === "signup" ? authForm.name.trim() : "Alex Morgan",
      email: authForm.email.trim(),
      phone: authMode === "signup" ? authForm.phone.trim() : "07700 900123",
      instagram: authMode === "signup" && selectedRole === "detailer" ? authForm.instagram.trim() || "@your.details" : "@reece.details",
    });
    setAffiliateApplied(authMode === "signup" && selectedRole === "customer" && authForm.affiliate.trim().length > 2);
    if (authMode === "signup" && selectedRole === "detailer") {
      setCustomerBank({
        accountName: authForm.bankName.trim(),
        sortCode: authForm.sortCode.trim(),
        accountNumber: authForm.accountNumber.replace(/\D/g, ""),
      });
    }
    setAuthError("");
    setSessionRole(selectedRole);
    setAuthenticated(true);
    if (authMode === "signup" && selectedRole === "customer") {
      setCustomerWater(null);
      setShowWaterConsent(true);
    }
  };
  const signOut = () => {
    setAuthenticated(false);
    setSessionRole(null);
    setRole(null);
    setAuthMode("signin");
    setAuthError("");
    setAuthForm({ name: "", email: "", phone: "", password: "", affiliate: "", instagram: "", ownWater: true, bankName: "", sortCode: "", accountNumber: "", vatRegistered: false, vatNumber: "" });
    setTab("services");
    setFlow(null);
    setSheet(null);
  };
  const lookupVehicle = () => {
    const reg = newReg.replace(/\s/g, "").toUpperCase();
    if (reg.length < 5) { setLookupState("error"); return; }
    setLookupState("checking");
    setFoundVehicle(null);
    setChosenVehicleType("");
    window.setTimeout(() => {
      const lookupRecord = MOCK_VEHICLE_LOOKUPS[reg] || {
        registrationNumber: newReg.trim().toUpperCase(),
        make: "BMW",
        model: "3 Series",
        colour: "Grey",
        fuelType: "Petrol",
        yearOfManufacture: 2021,
        bodyStyle: "Saloon",
      };
      const found = vehicleFromLookup(lookupRecord);
      setFoundVehicle(found);
      setLookupState("found");
    }, 650);
  };
  const addVehicle = () => {
    if (!foundVehicle || !chosenVehicleType) return;
    const detailParts = foundVehicle.detail.split(" · ");
    const confirmedVehicle = {
      ...foundVehicle,
      bodyType: chosenVehicleType,
      detail: [...detailParts.slice(0, -1), VEHICLE_TYPE_LABELS[chosenVehicleType]].join(" · "),
    };
    setVehicles([...vehicles, confirmedVehicle]);
    setVehicle(vehicles.length);
    setNewReg("");
    setFoundVehicle(null);
    setChosenVehicleType("");
    setLookupState("idle");
    setSheet(null);
  };
  const selectSuggestion = (item: Address) => {
    setDraftAddress({ ...item, confirmed: false });
    setAddressQuery(`${item.full}, ${item.postcode}`);
  };
  const savePinnedAddress = () => {
    if (!draftAddress?.confirmed) return;
    setAddresses([...addresses, draftAddress]);
    setAddress(addresses.length);
    setAddressQuery("");
    setDraftAddress(null);
    setSheet(null);
  };

  if (!authenticated) {
    return <AuthScreen role={role} setRole={setRole} mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} error={authError} submit={submitAuth} />;
  }

  if (sessionRole === "detailer") {
    return <DetailerApp
      profile={profile}
      specialist={authForm.ownWater}
      vatRegistered={authForm.vatRegistered}
      vatNumber={authForm.vatNumber}
      payoutBank={customerBank}
      customerBooking={booked ? { date, time, car: car.name, reg: car.reg, service: clean.name, location: addresses[address].label, mode, payout: (confirmedQuote ?? selectedQuote).detailerEarnings } : null}
      onCustomerEnRoute={(minutes) => { setBookingStatus("on-way"); setBookingEta(minutes); }}
      signOut={signOut}
    />;
  }

  const Garage = () => (
    <>
      <Header title="My Garage" action={<button className="avatar" onClick={() => setTab("account")}>RT</button>} />
      <div className="scroll">
        <section className="car-hero">
          <div className="hero-copy">
            <span className="ready"><i /> Ready to book</span>
            <small>Selected vehicle</small>
            <h2>{car.name}</h2>
            <b className="reg">{car.reg}</b>
            <p>{car.detail}</p>
          </div>
          <div className="hero-car"><VehicleArtwork bodyType={car.bodyType} name={car.name} /></div>
        </section>

        <SectionHead eyebrow="YOUR VEHICLES" title="Choose a car" onManage={() => setSheet("vehicles")} />
        <div className="vehicle-row">
          {vehicles.map((item, i) => (
            <button key={item.reg} className={`vehicle-card ${vehicle === i ? "selected" : ""}`} onClick={() => setVehicle(i)}>
              <span className="car-tile"><VehicleArtwork bodyType={item.bodyType} name={item.name} /></span>
              <span><strong>{item.name}</strong><small>{item.reg}</small></span>
              <b>{vehicle === i ? "✓" : ""}</b>
            </button>
          ))}
          <button className="add-card" onClick={() => setSheet("vehicles")}><b>＋</b><span>Add vehicle</span></button>
        </div>

        <SectionHead eyebrow="SERVICE LOCATION" title="Where should we come?" onManage={() => setSheet("addresses")} />
        <button className="address-card" onClick={() => setSheet("addresses")}>
          <span className="pin">⌖</span>
          <span><strong>{addresses[address].label}</strong><small>{addresses[address].full.replace(`${addresses[address].label}, `, "")}, {addresses[address].postcode}</small></span>
          <b>›</b>
        </button>
        <button className={`water-status ${customerWater === false ? "specialist" : ""}`} onClick={() => setShowWaterConsent(true)}>
          <span>{customerWater === false ? "◈" : "≈"}</span>
          <span><strong>{customerWater === false ? "Specialist water supply required" : "Customer water available"}</strong><small>{customerWater === false ? "Only detailers carrying a transportable supply can accept" : "Your detailer may use your outdoor water supply"}</small></span>
          <b>Change</b>
        </button>
        {booked && bookingStatus === "on-way" && <section className="customer-alert">
          <span className="alert-pulse">●</span>
          <div><small>DETAILER ON THE WAY</small><strong>{pro.name} is heading to you</strong><p>Approximately {bookingEta} minutes away</p></div>
          <b>⌖</b>
        </section>}
        {booked && bookingStatus === "scheduled" && <section className="booking-eta-card">
          <span>◷</span><div><small>UPCOMING DETAIL</small><strong>{date} at {time}</strong><p>We’ll update you when {pro.name} starts travelling to you.</p></div>
        </section>}

        <section className="book-card">
          <small>AT-HOME CAR CARE</small><h3>Ready when you are.</h3><p>Professional detailing, right on your drive.</p>
          <button className="dark-cta" onClick={() => setTab("services")}>Book a detail <span>→</span></button>
        </section>
        <button className="upcoming" onClick={() => booked && setTab("history")}>
          <span>{booked ? "✓" : "✦"}</span>
          <span><strong>{booked ? `${clean.name} booked` : "No upcoming bookings"}</strong><small>{booked ? `${date} at ${time} · ${pro.name}` : "Your next clean will appear here."}</small></span>
          <b>{booked ? "›" : ""}</b>
        </button>
      </div>
    </>
  );

  const Services = () => (
    <>
      <Header title="Book a detail" action={<span className="mini-car"><VehicleArtwork bodyType={car.bodyType} name={car.name} /></span>} />
      <div className="scroll services-screen">
        <button className="fast-track-card" onClick={() => { setFastTrackEntry(true); setMode("Next Available"); setFlow("service"); }}>
          <span className="fast-track-icon">⚡</span>
          <span><small>FAST TRACK</small><strong>Book the next available detailer</strong><p>Start with your car and location. We’ll calculate the quote and find the nearest eligible professional.</p></span>
          <b>→</b>
        </button>
        <div className="service-divider"><span>Or explore services</span></div>
        <p className="intro">Choose a service to plan a standard, prebooked or priority booking.</p>
        {customerWater === false && <div className="specialist-notice"><b>◈ Specialist booking</b><span>Your request will only be offered to detailers carrying a transportable water supply.</span></div>}
        <div className="service-list">
          {SERVICES.map((item, i) => (
            <button key={item.name} className={`service-card ${item.popular ? "popular" : ""}`} onClick={() => { setFastTrackEntry(false); setService(i); setFlow("plan"); }}>
              {item.popular && <em>MOST POPULAR</em>}
              <span className="service-icon">{item.icon}</span>
              <span className="service-copy">
                <span><strong>{item.name}</strong></span>
                <small>{item.note} · {item.time}</small>
                <p>{item.features}</p>
              </span>
              <b className="arrow">→</b>
            </button>
          ))}
        </div>
        <p className="price-disclaimer">You purchase the service from ValX. ValX sets every quote using the selected service, vehicle type and detailer travel distance. Fast Track adds a flat £2 premium, and the first calculated total includes the mandatory £3.99 service fee.</p>
        <div className="trust"><span>✓ Vetted detailers</span><span>✓ Upfront prices</span><span>✓ At your address</span></div>
      </div>
    </>
  );

  const History = () => (
    <>
      <Header eyebrow="YOUR BOOKINGS" title="History" />
      <div className="scroll history-screen">
        {booked && <HistoryCard upcoming date={date} time={time} service={clean.name} vehicle={`${car.name} · ${car.reg}`} person={pro} price={(confirmedQuote ?? selectedQuote).customerTotal} status={bookingStatus} eta={bookingEta} onClick={() => setHistoryDetail("upcoming")} />}
        <HistoryCard date="12 Jul" time="10:30" service="Exterior + Interior" vehicle="Tesla Model 3 · OX10 7NP" person={marketValeters[1]} price={73.99} onClick={() => setHistoryDetail("july")} />
        <HistoryCard date="21 Jun" time="14:15" service="Exterior Detail" vehicle="Range Rover Evoque · RE22 CEX" person={marketValeters[0]} price={50.99} onClick={() => setHistoryDetail("june")} />
      </div>
    </>
  );

  const customerEditor = customerEdit ? {
    name: { title: "Edit full name", label: "Full name", value: profile.name, type: "text" },
    email: { title: "Edit email", label: "Email address", value: profile.email, type: "email" },
    phone: { title: "Edit phone number", label: "Mobile number", value: profile.phone, type: "tel" },
    payment: { title: "Edit payment method", label: "Payment method", value: paymentMethod, type: "text" },
    notifications: { title: "Edit notifications", label: "Optional offers", value: marketingNotifications ? "On" : "Off", type: "text" },
    support: { title: "Help & support", label: "Preferred support channel", value: supportPreference, type: "text" },
  }[customerEdit] : null;

  const saveCustomerEdit = (value: string) => {
    const cleanValue = value.trim();
    if (!cleanValue || !customerEdit) return;
    if (customerEdit === "name") setProfile({ ...profile, name: cleanValue });
    if (customerEdit === "email") setProfile({ ...profile, email: cleanValue });
    if (customerEdit === "phone") setProfile({ ...profile, phone: cleanValue });
    if (customerEdit === "support") setSupportPreference(cleanValue);
    setCustomerEdit(null);
  };

  const Account = () => (
    <>
      <Header eyebrow="YOUR DETAILS" title="Account" />
      <div className="scroll account-screen">
        <button className="profile editable-profile" onClick={() => setCustomerEdit("name")}><span>{profile.name.split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase()}</span><div><h2>{profile.name}</h2><p>{profile.email}</p><p>{profile.phone}</p></div><b>Edit</b></button>
        {[
          ["✉", "Email", profile.email, "email"],
          ["☎", "Phone number", profile.phone, "phone"],
          ["⌖", "Saved addresses", `${addresses.length} locations`],
          ["🚘", "My vehicles", `${vehicles.length} vehicles`],
          [customerWater === false ? "◈" : "≈", "Water access", customerWater === false ? "No · specialist required" : "Yes · outdoor supply available"],
          ["?", "Help & support", supportPreference, "support"],
        ].map(([icon, name, detail, edit]) => (
          <button className="setting" key={name} onClick={() => {
            if (name === "Water access") setShowWaterConsent(true);
            else if (name === "Saved addresses") setSheet("addresses");
            else if (name === "My vehicles") setSheet("vehicles");
            else setCustomerEdit(edit as CustomerEdit);
          }}><span>{icon}</span><span><strong>{name}</strong><small>{detail}</small></span><b>›</b></button>
        ))}
        <button className="setting" onClick={() => setPaymentOpen(true)}><span>▱</span><span><strong>Payment methods</strong><small>{paymentMethod === "Bank account" ? `Bank account · •••• ${customerBank.accountNumber.slice(-4)}` : paymentMethod}</small></span><b>›</b></button>
        <div className="notification-essential"><span>✓</span><div><strong>Essential booking updates</strong><small>Always on · confirmations, cancellations, payment receipts and “on my way” alerts</small></div></div>
        <div className="setting toggle-setting"><span>◉</span><span><strong>Offers & product updates</strong><small>{marketingNotifications ? "Optional messages on" : "Optional messages off"}</small></span><button className={`switch ${marketingNotifications ? "on" : ""}`} role="switch" aria-checked={marketingNotifications} aria-label="Toggle optional offers and product updates" onClick={() => setMarketingNotifications((current) => !current)}><i /></button></div>
        <button className="setting" onClick={() => setShowPolicies(true)}><span>§</span><span><strong>Booking & care policies</strong><small>Cancellations, weather, access and damage</small></span><b>›</b></button>
        <div className="support-contact"><span>PROTOTYPE SUPPORT EMAIL · NOT MONITORED</span><strong>{CUSTOMER_SUPPORT_EMAIL}</strong><small>Customer support placeholder</small></div>
        <button className="sign-out" onClick={signOut}>Sign out</button>
        <p className="prototype">Interactive concept · No live payments or bookings are made.</p>
      </div>
    </>
  );

  const renderFlowScreen = () => {
    if (!flow) return null;
    return (
      <section className="flow">
        {flow !== "complete" && <header className="flow-head"><button onClick={back}>‹</button><strong>{flow === "service" ? "Choose a service" : flow === "browse" ? "Choose a detailer" : flow === "profile" ? "Detailer profile" : flow === "plan" ? "Plan your detail" : flow === "review" ? "Review booking" : "Book a detail"}</strong><button onClick={closeFlow}>×</button></header>}

        {flow === "service" && <div className="flow-scroll">
          <Step>FAST TRACK · STEP 1</Step><Title title="What does your car need?" lead="Choose the job first. Your exact quote will be calculated from the vehicle type and travel distance." />
          <div className="service-list compact-services">
            {SERVICES.map((item, i) => <button key={item.name} className={`service-card ${item.popular ? "popular" : ""}`} onClick={() => { setService(i); setFlow("plan"); }}>
              {item.popular && <em>MOST POPULAR</em>}<span className="service-icon">{item.icon}</span><span className="service-copy"><span><strong>{item.name}</strong></span><small>{item.time}</small><p>{item.features}</p></span><b className="arrow">→</b>
            </button>)}
          </div>
        </div>}

        {flow === "browse" && <div className="flow-scroll">
          <Step>{mode.toUpperCase()}</Step><Title title={customerWater === false ? "Choose a water specialist" : "Compare local detailers"} lead={customerWater === false ? "Only detailers carrying a transportable water supply can take this request. Your locked total is still shown before payment." : "Every total is calculated by the platform and includes the £3.99 service fee. Tap a profile for experience and reviews."} />
          <div className="market-list">{availableValeters.map((person) => {
            const i = marketValeters.indexOf(person);
            return <article key={person.name}>
            <button className="market-profile" onClick={() => { setValeter(i); setFlow("profile"); }}>
              <Avatar person={person} large /><span><strong>{person.name}</strong><small>★ {person.rating} · {person.reviews} reviews</small><b>{person.distance} away · {person.jobs}</b></span><em>£{formatMoney(calculateQuote(clean, car.bodyType, person.distance, { affiliate: affiliateApplied, fastTrack: mode === "Next Available" }).customerTotal)}</em>
            </button>
            <div><span>{person.specialist ? "◈ Water specialist" : person.badges[0]}</span><span>{person.badges[1]}</span><button onClick={() => { setValeter(i); setFlow("priority"); }}>Choose</button></div>
          </article>})}</div>
        </div>}

        {flow === "profile" && <div className="flow-scroll profile-detail">
          <div className="profile-hero"><Avatar person={pro} large /><h2>{pro.name}</h2><p>★ {pro.rating} <span>({pro.reviews} reviews)</span></p><small>{pro.distance} away · {pro.jobs}</small></div>
          <div className="profile-price"><span><small>{clean.name.toUpperCase()} · CUSTOMER TOTAL</small><strong>{clean.time} · £3.99 fee included</strong></span><b>£{formatMoney(selectedPrice)}</b></div>
          {pro.specialist && <div className="specialist-badge">◈ Carries a transportable water supply</div>}
          <div className="profile-about"><Step>ABOUT</Step><p>{pro.bio}</p><div>{pro.badges.map(badge => <span key={badge}>✓ {badge}</span>)}</div></div>
          <div className="review-preview"><span><b>★ 5.0</b><small>Recent customer review</small></span><p>“{pro.reviewText}”</p><small>Verified booking · 2 weeks ago</small></div>
          <button className="all-reviews">Read all {pro.reviews} reviews <span>›</span></button>
          <CTA onClick={() => setFlow("priority")}>Choose {pro.name}</CTA>
        </div>}

        {flow === "plan" && <div className="flow-scroll">
          <div className="pills"><span>⌂ At home</span><span>🚘 {car.reg}</span></div>
          <Title title="Plan your detail" lead="Confirm what we’re cleaning and where you’d like us to come." />
          <div className="order-box">
            <div className="route"><i /><i /></div>
            <button onClick={() => setSheet("vehicles")} aria-label={`Change vehicle. Currently ${car.name}, ${car.reg}`}><span><small>VEHICLE · TAP TO CHANGE</small><strong>{car.name}</strong><b>{car.reg}</b></span><em>›</em></button>
            <button onClick={() => setSheet("addresses")}><span><small>SERVICE ADDRESS · PIN CONFIRMED</small><strong>{addresses[address].label}</strong><b>{addresses[address].full}, {addresses[address].postcode}</b></span><em>›</em></button>
          </div>
          <div className={`water-request ${customerWater === false ? "no-water" : ""}`}><span>{customerWater === false ? "◈" : "≈"}</span><div><small>WATER AT LOCATION</small><strong>{customerWater === false ? "Not available · specialist only" : "Customer supply available"}</strong></div></div>
          <div className="selected-service"><span className="service-icon">{clean.icon}</span><span><small>SELECTED DETAIL SERVICE</small><strong>{clean.name}</strong><b>{clean.time} · Price shown after you choose how to book</b></span><em>→</em></div>
          <CTA onClick={() => setFlow(fastTrackEntry ? "matching" : "method")}>{fastTrackEntry ? "Find next available detailer" : "Continue"}</CTA>
        </div>}

        {flow === "method" && <div className="flow-scroll">
          <Step>STEP 2 OF 3</Step><Title title="How would you like to book?" lead="Choose speed, control, or a time that suits you." />
          <div className="modes">
            <ModeCard icon="★" title="Priority Pick" text="Choose your preferred detailer and one of their available times." onClick={() => chooseMode("Priority Pick")} />
            <ModeCard recommended icon="⚡" title="Next Available" text="We’ll find a highly rated nearby detailer to accept your job." onClick={() => chooseMode("Next Available")} />
            <ModeCard icon="□" title="Prebook" text="Choose a date and time, then see who is available." onClick={() => chooseMode("Prebook")} />
          </div>
        </div>}

        {flow === "priority" && <div className="flow-scroll">
          <Step>PRIORITY PICK</Step><Title title={`Choose a time with ${pro.name}`} lead={`Your calculated customer total is £${formatMoney(selectedPrice)}, including the £3.99 service fee. Choose one of this detailer’s available times.`} />
          <button className="change-detailer" onClick={() => setFlow("browse")}>‹ Change detailer</button>
          <div className="valeter-list">
            {[pro].map((person) => {
              const i = valeter;
              return <article className={valeter === i ? "selected" : ""} key={person.name}>
              <button className="pro-top" onClick={() => setValeter(i)}><Avatar person={person} /><span><strong>{person.name}</strong><small>★ {person.rating} ({person.reviews}) · {person.jobs}</small><b>{person.distance} away</b></span><em>{valeter === i ? "●" : "○"}</em></button>
              <div className="times">{person.times.map((slot) => <button className={valeter === i && time === slot ? "selected" : ""} key={slot} onClick={() => { setValeter(i); setTime(slot); }}>{slot}</button>)}</div>
            </article>})}
          </div>
          <CTA sticky onClick={openLockedReview}>Review booking</CTA>
        </div>}

        {flow === "prebook" && <div className="flow-scroll">
          <Step>PREBOOK</Step><Title title="Choose a time" lead="Pick your preferred slot and see the detailers available." />
          <Picker label="Date" values={["Today", "Tomorrow", "Thu 30", "Fri 31"]} value={date} setValue={setDate} />
          <Picker grid label="Time" values={["09:30", "10:30", "12:00", "13:30", "15:00", "16:30"]} value={time} setValue={setTime} />
          <h3 className="picker-label">Available detailers</h3>
          <div className="compact-pros">{availableValeters.slice(0, 2).map((person) => { const i = marketValeters.indexOf(person); return <button className={valeter === i ? "selected" : ""} key={person.name} onClick={() => setValeter(i)}><Avatar person={person} /><span><strong>{person.name}</strong><small>★ {person.rating} · {person.jobs}</small></span><em>{valeter === i ? "✓" : ""}</em></button>})}</div>
          <CTA sticky onClick={openLockedReview}>Review booking</CTA>
        </div>}

        {flow === "matching" && <div className="matching">
          <div className={`radar ${matched ? "found" : ""}`}><i /><i /><i /><span>{matched ? marketValeters[0].initials : <VehicleArtwork bodyType={car.bodyType} name={car.name} />}</span></div>
          <Step>{matched ? "DETAILER FOUND" : "SEARCHING NEARBY"}</Step>
          <Title title={matched ? `${marketValeters[0].name} is available` : "Finding your detailer…"} lead={matched ? `★ ${marketValeters[0].rating} · ${marketValeters[0].distance} away · arrival around 12:00` : "We’re offering your booking to highly rated detailers close to your address."} />
          {!matched ? <><div className="searching"><i /> Contacting nearby detailers</div><button className="simulate" onClick={() => { setMatched(true); setValeter(0); setTime("12:00"); }}>Simulate acceptance</button></> : <CTA onClick={openLockedReview}>Review match</CTA>}
        </div>}

        {flow === "review" && <div className="flow-scroll review">
          <Step>FINAL STEP · PRICE LOCKED</Step><Title title="Everything look right?" lead="This is the complete amount you authorise. It will not increase after the detailer accepts." />
          <div className="review-pro"><Avatar person={pro} large /><span><small>YOUR DETAILER</small><strong>{pro.name}</strong><b>★ {pro.rating} · {pro.jobs}</b></span></div>
          <div className="review-list">
            <ReviewRow label="Service" value={clean.name} />
            <ReviewRow label="Vehicle" value={car.name} sub={car.reg} />
            <button className="review-change" onClick={() => setSheet("vehicles")}>Change vehicle <span>›</span></button>
            <ReviewRow label="When" value={`${date}, ${time}`} />
            <ReviewRow label="Where" value={addresses[address].label} sub={`${addresses[address].full}, ${addresses[address].postcode} · Pin confirmed`} />
            <ReviewRow label="Water" value={customerWater === false ? "Not available" : "Customer supply available"} sub={customerWater === false ? "Transportable supply specialist required" : undefined} />
            <ReviewRow label="Booking type" value={mode} />
            <ReviewRow label="Payment" value={paymentMethod === "Bank account" ? `Bank account •••• ${customerBank.accountNumber.slice(-4)}` : paymentMethod} />
          </div>
          <div className="quote-breakdown">
            <div><span>{clean.name}</span><b>£{formatMoney(clean.basePrice)}</b></div>
            {selectedQuote.vehicleAdjustment > 0 && <div><span>{VEHICLE_TYPE_LABELS[car.bodyType]} adjustment</span><b>£{formatMoney(selectedQuote.vehicleAdjustment)}</b></div>}
            {selectedQuote.travelAdjustment > 0 && <div><span>Travel beyond {INCLUDED_TRAVEL_MILES} miles</span><b>£{formatMoney(selectedQuote.travelAdjustment)}</b></div>}
            {selectedQuote.fastTrackAdjustment > 0 && <div><span>Fast Track premium</span><b>£{formatMoney(selectedQuote.fastTrackAdjustment)}</b></div>}
            {selectedQuote.affiliateDiscount > 0 && <div className="saving"><span>Affiliate welcome discount</span><b>−£{formatMoney(selectedQuote.affiliateDiscount)}</b></div>}
            <div><span>Job price</span><b>£{formatMoney(discountedPrice)}</b></div>
            <div><span>Service fee</span><b>£{formatMoney(SERVICE_FEE)}</b></div>
          </div>
          <div className="total locked-total"><span><b>✓ PRICE LOCKED</b>Customer total</span><strong>£{formatMoney(selectedQuote.customerTotal)}</strong></div>
          <p className="payment-note">Changing the vehicle, service, address, time or detailer requires a fresh quote before payment. Once confirmed, this total cannot rise.</p>
          <p className="payment-note">The £3.99 service fee is charged once per visit. No payment will be taken in this proof of concept.</p>
          <CTA onClick={confirmBooking}>Confirm & pay £{formatMoney(selectedQuote.customerTotal)}</CTA>
        </div>}

        {flow === "complete" && <div className="success">
          <div className="check">✓</div><Step>BOOKING CONFIRMED</Step>
          <Title title="Your detail is booked." lead={mode === "Next Available" ? `${pro.name} is on the way. Your current approximate arrival time is ${bookingEta} minutes.` : `${pro.name} is booked for ${time}. We’ll notify you when they are on the way.`} />
          <div className="success-summary"><span>{date}<b>{time}</b></span><span>{car.reg}<b>£{formatMoney(selectedQuote.customerTotal)}</b></span></div>
          <p className="eta-disclaimer">Arrival times are estimates only. Traffic, the detailer’s current job and their live schedule may affect the actual time.</p>
          <CTA onClick={() => { closeFlow(); setTab("services"); }}>Back to Services</CTA>
          <button className="secondary" onClick={() => { closeFlow(); setTab("history"); }}>View booking</button>
        </div>}
      </section>
    );
  };

  return (
    <main className="app-shell customer-shell">
      <div className="ambient one" /><div className="ambient two" />
      <section className="phone" aria-label="ValX customer app proof of concept">
        <div className="status"><span>9:41</span><span>▮▮▮ ᯤ 93</span></div>
        {tab === "services" && <Services />}{tab === "garage" && <Garage />}{tab === "history" && <History />}{tab === "account" && <Account />}
        <nav className="nav">
          {[["services","▦","Services"],["garage","⌂","My Garage"],["history","◷","History"],["account","◎","Account"]].map(([id, icon, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id as Tab); closeFlow(); }}><b>{icon}</b><span>{label}</span></button>)}
        </nav>
        {renderFlowScreen()}
        {sheet && <div className="scrim" onClick={() => setSheet(null)}><section className="sheet" onClick={(e) => e.stopPropagation()}>
          <i className="handle" /><div className="sheet-title"><div><Step>{sheet === "vehicles" ? "MY GARAGE" : "SAVED LOCATIONS"}</Step><h2>Manage {sheet}</h2></div><button onClick={() => setSheet(null)}>×</button></div>
          {sheet === "vehicles" ? <>
            <div className="manage-list">{vehicles.map((item, i) => <div key={item.reg}><span className="car-tile"><VehicleArtwork bodyType={item.bodyType} name={item.name} /></span><button onClick={() => changeBookingVehicle(i)}><strong>{item.name}</strong><small>{item.reg} · {item.detail}</small></button><button className="remove" disabled={vehicles.length === 1} onClick={() => { setVehicles(vehicles.filter((_, x) => x !== i)); setVehicle(0); setLockedQuote(null); }}>Remove</button></div>)}</div>
            <div className="add-form vehicle-lookup"><label htmlFor="reg">Find your vehicle by registration</label><div><input id="reg" placeholder="e.g. RE22 CEX" value={newReg} onChange={(e) => { setNewReg(e.target.value.toUpperCase()); setLookupState("idle"); setFoundVehicle(null); setChosenVehicleType(""); }} /><button onClick={lookupVehicle}>{lookupState === "checking" ? "…" : "Look up"}</button></div>
              {lookupState === "error" && <small className="form-error">Enter a valid UK registration.</small>}
              {foundVehicle && <div className="lookup-confirm">
                <div className="lookup-result"><span className="car-tile"><VehicleArtwork bodyType={chosenVehicleType || foundVehicle.bodyType} name={foundVehicle.name} /></span><span><strong>{foundVehicle.name}</strong><small>{foundVehicle.reg} · {foundVehicle.detail}</small></span></div>
                <label htmlFor="vehicle-type">Vehicle type <b>Required</b></label>
                <select id="vehicle-type" value={chosenVehicleType} onChange={(event) => setChosenVehicleType(event.target.value as VehicleType)}>
                  <option value="">Choose a vehicle type</option>
                  {VEHICLE_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{VEHICLE_TYPE_LABELS[type]}</option>)}
                </select>
                <button className="link-vehicle" disabled={!chosenVehicleType} onClick={addVehicle}>Link car</button>
              </div>}
              <small className="secure-note">Registration details are represented for this proof of concept. Customers must confirm Hatchback, Sedan, SUV, Coupe, Pickup truck or Other before linking a vehicle. Try FD19 STA, RE22 CEX, OX10 7NP, CP21 TWO or PK24 TRK.</small>
            </div>
          </> : <>
            <div className="manage-list">{addresses.map((item, i) => <div key={`${item.full}-${item.postcode}`}><span className="pin">⌖</span><button onClick={() => { setAddress(i); setSheet(null); }}><strong>{item.label}</strong><small>{item.full}, {item.postcode} · Pin confirmed</small></button><button className="remove" disabled={addresses.length === 1} onClick={() => { setAddresses(addresses.filter((_, x) => x !== i)); setAddress(0); }}>Remove</button></div>)}</div>
            <div className="address-search">
              <label htmlFor="address-search">Add a precise service address</label>
              <div className="search-input"><span>⌕</span><input id="address-search" value={addressQuery} onChange={(e) => { setAddressQuery(e.target.value); setDraftAddress(null); }} placeholder="Start typing your house number and road" /></div>
              {addressQuery && !draftAddress && <div className="suggestions">{ADDRESS_SUGGESTIONS.filter(x => `${x.full} ${x.postcode}`.toLowerCase().includes(addressQuery.toLowerCase())).map(item => <button key={item.postcode + item.label} onClick={() => selectSuggestion(item)}><span className="pin">⌖</span><span><strong>{item.label}</strong><small>{item.full}, {item.postcode}</small></span></button>)}</div>}
              {draftAddress && <div className="map-confirm">
                <div className="mini-map"><i className={draftAddress.confirmed ? "dropped" : ""}>⌖</i><span>Drag map to refine pin</span></div>
                <strong>{draftAddress.full}</strong><small>{draftAddress.postcode}</small>
                <button className={draftAddress.confirmed ? "confirmed" : ""} onClick={() => setDraftAddress({ ...draftAddress, confirmed: true })}>{draftAddress.confirmed ? "✓ Exact pin confirmed" : "Confirm pin at this address"}</button>
                <button className="save-address" disabled={!draftAddress.confirmed} onClick={savePinnedAddress}>Save full address</button>
              </div>}
              <p>House number or name, street, town/city and full postcode are required. A confirmed pin is required before booking.</p>
            </div>
          </>}
        </section></div>}
        {showWaterConsent && <WaterConsent
          current={customerWater}
          onChoose={(choice) => {
            setCustomerWater(choice);
            setValeter(0);
            setShowWaterConsent(false);
          }}
        />}
        {customerEditor && <AccountEditSheet
          title={customerEditor.title}
          label={customerEditor.label}
          initialValue={customerEditor.value}
          type={customerEditor.type}
          onClose={() => setCustomerEdit(null)}
          onSave={saveCustomerEdit}
        />}
        {paymentOpen && <PaymentMethodSheet
          method={paymentMethod}
          bank={customerBank}
          onClose={() => setPaymentOpen(false)}
          onSave={(nextMethod, nextBank) => {
            setPaymentMethod(nextMethod);
            setCustomerBank(nextBank);
            setPaymentOpen(false);
          }}
        />}
        {showPolicies && <PolicySheet onClose={() => setShowPolicies(false)} />}
        {historyDetail && <section className="job-detail-view">
          <header><button onClick={() => { setHistoryDetail(null); setRescheduling(false); setDocumentView(null); }}>‹</button><strong>Job details</strong><span /></header>
          <div className="job-detail-scroll">
            <Step>{historyDetail === "upcoming" ? bookingStatus === "on-way" ? "DETAILER ON THE WAY" : "UPCOMING BOOKING" : "COMPLETED DETAIL"}</Step>
            <h1>{historyDetail === "upcoming" ? clean.name : historyDetail === "july" ? "Exterior + Interior" : "Exterior Detail"}</h1>
            <p className="job-detail-sub">{historyDetail === "upcoming" ? `${car.name} · ${car.reg}` : historyDetail === "july" ? "Tesla Model 3 · OX10 7NP" : "Range Rover Evoque · RE22 CEX"}</p>
            {historyDetail === "upcoming" ? <>
              <section className={`live-arrival ${bookingStatus === "on-way" ? "active" : ""}`}>
                <span>{bookingStatus === "on-way" ? "⌖" : "◷"}</span>
                <div><small>{bookingStatus === "on-way" ? "LIVE ARRIVAL ESTIMATE" : "SCHEDULED FOR"}</small><strong>{bookingStatus === "on-way" ? `Approximately ${bookingEta} minutes` : `${date} at ${time}`}</strong><p>{bookingStatus === "on-way" ? `${pro.name} has started travelling to your address.` : `You’ll be notified when ${pro.name} taps “On my way”.`}</p></div>
              </section>
              <p className="eta-disclaimer">Arrival times are approximate. Traffic, travel conditions and earlier bookings can change the estimate.</p>
              {!rescheduling ? <div className="booking-actions"><button onClick={() => setRescheduling(true)}>Reschedule booking</button><button className="cancel-booking" onClick={() => { setBooked(false); setHistoryDetail(null); setBookingStatus("scheduled"); }}>Cancel booking</button></div> :
              <section className="reschedule-panel"><Step>CHOOSE A NEW SLOT</Step><Picker label="Date" values={["Today", "Tomorrow", "Thu 30", "Fri 31"]} value={date} setValue={setDate} /><Picker grid label="Time" values={["09:30", "10:30", "12:00", "13:30", "15:00", "16:30"]} value={time} setValue={setTime} /><button onClick={() => { setBookingStatus("scheduled"); setRescheduling(false); }}>Save new time</button></section>}
            </> : <>
              <section className="job-evidence-summary"><div><small>COMPLETED</small><strong>{historyDetail === "july" ? "12 Jul · 10:30" : "21 Jun · 14:15"}</strong></div><div><small>DETAILER</small><strong>{historyDetail === "july" ? marketValeters[1].name : marketValeters[0].name}</strong></div></section>
              <h3 className="evidence-heading">Before the detail</h3>
              <div className="customer-photo-grid">{["Front condition", "Rear condition", "Driver side"].map((label, index) => <button key={label}><span>{index === 0 ? "🚘" : index === 1 ? "🚗" : "◈"}</span><small>{label}</small></button>)}</div>
              <div className="blemish-record"><span>✓</span><div><strong>Condition record attached</strong><small>{historyDetail === "july" ? "2 minor blemishes marked before work" : "No pre-existing blemishes recorded"}</small></div></div>
              <h3 className="evidence-heading">After the detail</h3>
              <div className="customer-photo-grid after">{["Finished front", "Finished rear", "Interior finish"].map((label, index) => <button key={label}><span>{index === 2 ? "✦" : "🚘"}</span><small>{label}</small></button>)}</div>
              <p className="photo-note">Photos were supplied by the detailer and attached to this completed job.</p>
            </>}
            <button className="document-link" onClick={() => setDocumentView("customer")}><span>▤</span><div><strong>View customer invoice</strong><small>Itemised job price, £3.99 service fee and total paid</small></div><b>›</b></button>
          </div>
        </section>}
        {documentView === "customer" && historyDetail && <CustomerInvoice
          invoiceNumber={historyDetail === "upcoming" ? "DET-260729-1042" : historyDetail === "july" ? "DET-260712-0834" : "DET-260621-0719"}
          date={historyDetail === "upcoming" ? `${date} · ${time}` : historyDetail === "july" ? "12 July 2026 · 10:30" : "21 June 2026 · 14:15"}
          service={historyDetail === "upcoming" ? clean.name : historyDetail === "july" ? "Exterior + Interior" : "Exterior Detail"}
          vehicle={historyDetail === "upcoming" ? `${car.name} · ${car.reg}` : historyDetail === "july" ? "Tesla Model 3 · OX10 7NP" : "Range Rover Evoque · RE22 CEX"}
          jobPrice={historyDetail === "upcoming" ? (confirmedQuote ?? selectedQuote).jobPrice : historyDetail === "july" ? 70 : 47}
          onClose={() => setDocumentView(null)}
        />}
      </section>
    </main>
  );
}

function CustomerInvoice({ invoiceNumber, date, service, vehicle, jobPrice, onClose }: {
  invoiceNumber: string;
  date: string;
  service: string;
  vehicle: string;
  jobPrice: number;
  onClose: () => void;
}) {
  const total = roundMoney(jobPrice + SERVICE_FEE);
  return <div className="document-scrim" onClick={onClose}>
    <article className="financial-document" role="dialog" aria-modal="true" aria-label="Customer invoice" onClick={(event) => event.stopPropagation()}>
      <header><div><small>CUSTOMER INVOICE</small><h2>ValX</h2></div><button onClick={onClose}>×</button></header>
      <div className="document-meta"><span><small>Invoice</small><strong>{invoiceNumber}</strong></span><span><small>Date</small><strong>{date}</strong></span></div>
      <section className="document-parties"><div><small>BILLED TO</small><strong>Alex Morgan</strong><span>Customer account · DEMO-1042</span></div><div><small>LEGAL SUPPLIER</small><strong>ValX</strong><span>ValX supplies the booked service</span></div></section>
      <div className="document-service"><span><small>SERVICE</small><strong>{service}</strong><b>{vehicle}</b></span><strong>£{formatMoney(jobPrice)}</strong></div>
      <div className="document-totals"><span><small>Job price</small><b>£{formatMoney(jobPrice)}</b></span><span><small>Service fee</small><b>£{formatMoney(SERVICE_FEE)}</b></span><span className="grand"><small>Total paid</small><b>£{formatMoney(total)}</b></span></div>
      <p>The customer purchased this service from ValX and paid using the selected payment method. This prototype invoice is for interface review only.</p>
      <button className="document-action" onClick={() => window.print()}>Print or save invoice</button>
    </article>
  </div>;
}

function SelfBillingDocument({ detailerName, vatRegistered, vatNumber, service, vehicle, grossPay, documentNumber, taxPoint, onClose }: {
  detailerName: string;
  vatRegistered: boolean;
  vatNumber: string;
  service: string;
  vehicle: string;
  grossPay: number;
  documentNumber: string;
  taxPoint: string;
  onClose: () => void;
}) {
  const net = vatRegistered ? roundMoney(grossPay / 1.2) : grossPay;
  const vat = vatRegistered ? roundMoney(grossPay - net) : 0;
  return <div className="document-scrim" onClick={onClose}>
    <article className="financial-document self-billing" role="dialog" aria-modal="true" aria-label={vatRegistered ? "VAT self-billing invoice" : "Self-billing statement"} onClick={(event) => event.stopPropagation()}>
      <header><div><small>{vatRegistered ? "SELF BILLING · VAT INVOICE" : "SELF-BILLING STATEMENT · NO VAT"}</small><h2>ValX</h2></div><button onClick={onClose}>×</button></header>
      <div className="document-meta"><span><small>Document</small><strong>{documentNumber}</strong></span><span><small>Tax point</small><strong>{taxPoint}</strong></span></div>
      <section className="document-parties"><div><small>SUPPLIER TO ValX</small><strong>{detailerName}</strong><span>{vatRegistered ? `VAT no. ${vatNumber || "Required"}` : "Not VAT registered"}</span></div><div><small>SELF-BILLER</small><strong>ValX</strong><span>Prototype business details</span></div></section>
      <div className="document-service"><span><small>SUBCONTRACTED SUPPLY</small><strong>{service}</strong><b>{vehicle} · completed for ValX</b></span><strong>£{formatMoney(grossPay)}</strong></div>
      <div className="document-totals">
        <span><small>{vatRegistered ? "Net supply value" : "Service payment"}</small><b>£{formatMoney(net)}</b></span>
        {vatRegistered && <span><small>VAT · 20%</small><b>£{formatMoney(vat)}</b></span>}
        <span className="grand"><small>Total paid to detailer</small><b>£{formatMoney(grossPay)}</b></span>
      </div>
      <p>{vatRegistered ? "Self billing. The supplier must not issue a separate VAT invoice for this supply." : "No VAT has been added because the supplier is recorded as not VAT registered."} This records the detailer’s agreed subcontractor payment from ValX; it is not a customer invoice or commission statement.</p>
      <button className="document-action" onClick={() => window.print()}>Print or save document</button>
    </article>
  </div>;
}

function WaterConsent({ current, onChoose }: { current: boolean | null; onChoose: (choice: boolean) => void }) {
  return <div className="consent-scrim">
    <section className="consent-card" role="dialog" aria-modal="true" aria-label="Water use consent">
      <span className="consent-icon">≈</span>
      <Step>SERVICE SETUP</Step>
      <h2>Can your detailer use your water?</h2>
      <p>Allowing access to an outdoor tap means any suitable nearby detailer can take your job.</p>
      <button className={current === true ? "chosen" : ""} onClick={() => onChoose(true)}><span><b>Yes, they may use my water</b><small>Standard booking · wider availability</small></span><strong>✓</strong></button>
      <button className={`no-water-choice ${current === false ? "chosen" : ""}`} onClick={() => onChoose(false)}><span><b>No, do not use my water</b><small>Only specialists with a transportable supply can attend. Your complete total will still be locked before payment.</small></span><strong>◈</strong></button>
      <small className="consent-note">You can change this later in Account. Your answer is attached to every job request.</small>
    </section>
  </div>;
}

function DetailerApp({ profile, specialist, vatRegistered, vatNumber, payoutBank, customerBooking, onCustomerEnRoute, signOut }: {
  profile: { name: string; email: string; phone: string; instagram: string };
  specialist: boolean;
  vatRegistered: boolean;
  vatNumber: string;
  payoutBank: BankDetails;
  customerBooking: CustomerBooking | null;
  onCustomerEnRoute: (minutes: number) => void;
  signOut: () => void;
}) {
  const [tab, setTab] = useState<DetailerTab>("jobs");
  const [jobs, setJobs] = useState<DetailerJob[]>(DETAILER_JOBS);
  const [selectedId, setSelectedId] = useState(DETAILER_JOBS[0].id);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [stage, setStage] = useState<JobStage>("available");
  const [jobNotice, setJobNotice] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [arrival, setArrival] = useState(0);
  const [arrivalDragging, setArrivalDragging] = useState(false);
  const arrivalTrackRef = useRef<HTMLDivElement>(null);
  const arrivalValueRef = useRef(0);
  const arrivalStartXRef = useRef(0);
  const arrivalStartValueRef = useRef(0);
  const arrivalTimerRef = useRef<number | null>(null);
  const [beforePhotos, setBeforePhotos] = useState(0);
  const [afterPhotos, setAfterPhotos] = useState(0);
  const [blemishLogged, setBlemishLogged] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState("REECEDETAILS");
  const [detailerProfile, setDetailerProfile] = useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    instagram: profile.instagram,
    specialist,
    radius: "12",
    vatRegistered,
    vatNumber: vatNumber || "",
  });
  const [detailerBank, setDetailerBank] = useState<BankDetails>(payoutBank);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [documentJob, setDocumentJob] = useState<DetailerJobRecord | null>(null);
  const [detailerJobRecord, setDetailerJobRecord] = useState<DetailerJobRecord | null>(null);
  const [detailerEdit, setDetailerEdit] = useState<DetailerEdit>(null);
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(29);
  const [onWayBooking, setOnWayBooking] = useState<string | null>(null);
  const [workingDays, setWorkingDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [masterHours, setMasterHours] = useState({ start: "08:30", end: "17:30" });
  const [dayOverrides, setDayOverrides] = useState<Record<string, { available: boolean; start: string; end: string }>>({
    "2026-07-29": { available: true, start: "09:30", end: "17:00" },
  });
  const [hoursEditor, setHoursEditor] = useState<null | "master" | "day">(null);
  const [hoursDraft, setHoursDraft] = useState({ available: true, start: "08:30", end: "17:30" });
  const detailerStartDate = new Date(2026, 2, 1);
  const minimumCalendarOffset = (detailerStartDate.getFullYear() - 2026) * 12 + detailerStartDate.getMonth() - 6;
  const maximumCalendarOffset = 3;
  const pricedJobs = DETAILER_JOBS.map((job) => {
    const serviceIndex = SERVICES.findIndex((service) => service.name === job.type);
    const serviceDefinition = SERVICES[serviceIndex >= 0 ? serviceIndex : 0];
    const quote = calculateQuote(serviceDefinition, job.bodyType, job.distance, { fastTrack: job.id === 1 });
    return {
      ...job,
      customerPrice: quote.customerTotal,
      serviceFee: quote.serviceFee,
      payout: quote.detailerEarnings,
      predictedMinutes: quote.predictedMinutes,
    };
  });
  const currentJobIds = new Set(jobs.map((job) => job.id));
  const liveAvailableJobs = pricedJobs.filter((job) => currentJobIds.has(job.id));
  const availableJobs = detailerProfile.specialist ? liveAvailableJobs : liveAvailableJobs.filter((job) => !job.specialistOnly);
  const selectedJob = availableJobs.find((job) => job.id === selectedId) || availableJobs[0] || null;
  const activeJob = pricedJobs.find((job) => job.id === activeId) || selectedJob || pricedJobs[0];
  const calendarDate = new Date(2026, 6 + calendarOffset, 1);
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const calendarLabel = calendarDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const mondayStartOffset = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
  const selectedDateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
  const customerBookingDateKey = customerBooking ? customerBooking.date === "Tomorrow" ? "2026-07-30" : customerBooking.date === "Thu 30" ? "2026-07-30" : customerBooking.date === "Fri 31" ? "2026-07-31" : "2026-07-29" : null;
  const baseSelectedScheduleJobs = (SCHEDULE_BOOKINGS[selectedDateKey] || []).filter((item) => !(customerBooking && selectedDateKey === customerBookingDateKey && item.reg === customerBooking.reg));
  const selectedScheduleJobs = [
    ...baseSelectedScheduleJobs,
    ...(customerBooking && selectedDateKey === customerBookingDateKey
      ? [{ id: "customer-live", time: customerBooking.time, car: customerBooking.car, reg: customerBooking.reg, service: customerBooking.service, location: customerBooking.location, payout: customerBooking.payout, duration: SERVICES.find((item) => item.name === customerBooking.service)?.time || "1–2 hours", customer: "Current customer" }]
      : []),
  ];
  const selectedOverride = dayOverrides[selectedDateKey];
  const monthPrefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}`;
  const monthBookings = Object.entries(SCHEDULE_BOOKINGS)
    .filter(([key]) => key.startsWith(monthPrefix))
    .flatMap(([, items]) => items)
    .concat(customerBooking && customerBookingDateKey?.startsWith(monthPrefix) ? [{
      id: "customer-month",
      time: customerBooking.time,
      car: customerBooking.car,
      reg: customerBooking.reg,
      service: customerBooking.service,
      location: customerBooking.location,
      payout: customerBooking.payout,
      duration: SERVICES.find((item) => item.name === customerBooking.service)?.time || "1–2 hours",
      customer: "Current customer",
    }] : []);
  const monthPayout = monthBookings.reduce((total, booking) => total + booking.payout, 0);
  const selectedDayIsPast = selectedDateKey < "2026-07-29";
  const recordForBooking = (booking: ScheduleBooking, dateLabel: string, completed: boolean): DetailerJobRecord => ({
    booking,
    dateLabel,
    completed,
    beforePhotos: ["Front condition", "Rear condition", "Driver side"],
    afterPhotos: ["Finished front", "Finished rear", booking.service.includes("Interior") || booking.service.includes("Deep") || booking.service.includes("Premium") ? "Interior finish" : "Wheel finish"],
    blemishSummary: booking.id.endsWith("a") ? "2 minor blemishes photographed before work" : "No pre-existing blemishes recorded",
  });

  useEffect(() => {
    if (!ENABLE_LIVE_MARKETPLACE_SYNC) {
      setJobs(DETAILER_JOBS);
      setJobNotice("");
      return;
    }

    let mounted = true;
    const refreshJobs = async () => {
      try {
        const response = await fetch("/api/jobs", { cache: "no-store" });
        if (!response.ok) throw new Error("Job sync unavailable");
        const data = await response.json() as { availableIds: number[] };
        if (mounted) {
          const nextJobs = DETAILER_JOBS.filter((job) => data.availableIds.includes(job.id));
          setJobs(nextJobs);
          setSelectedId((current) => nextJobs.some((job) => job.id === current) ? current : nextJobs[0]?.id ?? current);
        }
      } catch {
        if (mounted) setJobNotice("Using demo job data while marketplace sync reconnects.");
      }
    };
    refreshJobs();
    const timer = window.setInterval(() => {
      if (stage === "available") refreshJobs();
    }, 4000);
    const onFocus = () => refreshJobs();
    window.addEventListener("focus", onFocus);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [stage]);

  const acceptJob = async () => {
    if (!selectedJob || (selectedJob.specialistOnly && !detailerProfile.specialist)) return;

    if (!ENABLE_LIVE_MARKETPLACE_SYNC) {
      setJobNotice("");
      setActiveId(selectedJob.id);
      setJobs((current) => current.filter((job) => job.id !== selectedJob.id));
      setStage("navigating");
      setArrival(0);
      onCustomerEnRoute(Number.parseInt(selectedJob.eta, 10) || 18);
      return;
    }

    setAccepting(true);
    setJobNotice("");
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJob.id, detailerId: detailerProfile.email }),
      });
      if (response.status === 409) {
        setJobs((current) => current.filter((job) => job.id !== selectedJob.id));
        setJobNotice("That job was just accepted by another detailer and has been removed.");
        return;
      }
      if (!response.ok) throw new Error("Unable to accept job");
      setActiveId(selectedJob.id);
      setJobs((current) => current.filter((job) => job.id !== selectedJob.id));
      setStage("navigating");
      setArrival(0);
      onCustomerEnRoute(Number.parseInt(selectedJob.eta, 10) || 18);
    } catch {
      setJobNotice("The job could not be reserved. Please try again.");
    } finally {
      setAccepting(false);
    }
  };
  const confirmArrival = () => {
    arrivalValueRef.current = 100;
    setArrival(100);
    if (arrivalTimerRef.current !== null) window.clearTimeout(arrivalTimerRef.current);
    arrivalTimerRef.current = window.setTimeout(() => setStage("before"), 320);
  };
  const paintArrivalProgress = (next: number) => {
    const track = arrivalTrackRef.current;
    if (!track) return;
    track.style.setProperty("--arrival-progress", `${next}%`);
    const thumb = track.querySelector<HTMLButtonElement>(".arrival-thumb");
    if (!thumb) return;
    thumb.style.left = `calc(${next}% + ${6 - next * 0.66}px)`;
    thumb.setAttribute("aria-valuenow", String(Math.round(next)));
    thumb.setAttribute("aria-valuetext", `${Math.round(next)}% complete`);
  };
  const updateArrivalDrag = (clientX: number) => {
    const track = arrivalTrackRef.current;
    if (!track) return;
    const travel = Math.max(track.getBoundingClientRect().width - 66, 1);
    const delta = ((clientX - arrivalStartXRef.current) / travel) * 100;
    const next = Math.max(0, Math.min(100, arrivalStartValueRef.current + delta));
    arrivalValueRef.current = next;
    paintArrivalProgress(next);
  };
  const finishArrivalDrag = (target: HTMLButtonElement, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    setArrivalDragging(false);
    if (arrivalValueRef.current >= 84) {
      confirmArrival();
      return;
    }
    arrivalValueRef.current = 0;
    setArrival(0);
    window.requestAnimationFrame(() => paintArrivalProgress(0));
  };
  const cancelArrivalDrag = (target: HTMLButtonElement, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    setArrivalDragging(false);
    arrivalValueRef.current = 0;
    setArrival(0);
    window.requestAnimationFrame(() => paintArrivalProgress(0));
  };

  useEffect(() => {
    arrivalValueRef.current = arrival;
    paintArrivalProgress(arrival);
  }, [arrival]);

  useEffect(() => () => {
    if (arrivalTimerRef.current !== null) window.clearTimeout(arrivalTimerRef.current);
  }, []);

  const finishAndReset = (nextId?: number) => {
    if (nextId) setSelectedId(nextId);
    setActiveId(null);
    setStage("available");
    setBeforePhotos(0);
    setAfterPhotos(0);
    setBlemishLogged(false);
    setTab("jobs");
  };

  const JobMap = () => <div className="detailer-map">
    <div className="map-road r1" /><div className="map-road r2" /><div className="map-road r3" /><div className="map-park" />
    <div className="you-marker"><span>●</span><small>You</small></div>
    {availableJobs.map((job) => <button
      key={job.id}
      className={`job-bubble ${job.id === selectedId ? "selected" : ""} ${job.specialistOnly ? "specialist" : ""}`}
      style={{ top: job.top, left: job.left }}
      onClick={() => setSelectedId(job.id)}
      aria-label={`${job.car}, ${job.type}, earn £${job.payout}`}
    >
      <b>£{formatMoney(job.payout)}</b><span><VehicleArtwork bodyType={job.bodyType} name={job.car} /></span>{job.specialistOnly && <i>◈</i>}
    </button>)}
    {stage === "navigating" && <div className="route-line"><i /><i /></div>}
    <div className="map-key"><span><i className="standard" /> Standard</span><span><i className="specialist" /> No customer water</span></div>
  </div>;

  const renderJobs = () => <div className="detailer-jobs">
    <header className="detailer-top">
      <div><small>{stage === "navigating" ? "ACTIVE JOB" : "DETAILER MODE"}</small><h1>{stage === "navigating" ? "Navigating to location" : "Jobs near you"}</h1></div>
      <button onClick={() => setTab("account")}>{detailerProfile.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</button>
    </header>
    <JobMap />
    <section className={`job-drawer ${stage === "available" ? "available" : ""} ${activeJob.specialistOnly ? "specialist" : ""}`}>
      <i className="drawer-handle" />
      {stage === "available" && selectedJob ? <>
        <div className="job-pay"><span><small>GUARANTEED PAY · PAID IN FULL</small><b>£{formatMoney(selectedJob.payout)}</b></span><em><VehicleArtwork bodyType={selectedJob.bodyType} name={selectedJob.car} /></em></div>
        <p className="job-fee-note">Platform-calculated for this job · estimated {selectedJob.predictedMinutes} minutes on site, included in the job price</p>
        {selectedJob.specialistOnly && <div className="water-alert">◈ Customer water cannot be used · specialist only</div>}
        <h2>{selectedJob.type}</h2>
        <p>{selectedJob.car} · {selectedJob.location}</p>
        <div className="job-meta"><span><b>{selectedJob.distance}</b><small>Distance</small></span><span><b>{selectedJob.eta}</b><small>Drive time</small></span><span><b>{selectedJob.water ? "Available" : "Bring supply"}</b><small>Water</small></span></div>
        {jobNotice && <p className="job-notice">{jobNotice}</p>}
        <button className="accept-job" disabled={accepting} onClick={acceptJob}>{accepting ? "Reserving job…" : "Accept job"} <span>→</span></button>
      </> : stage === "available" ? <div className="no-jobs"><span>✓</span><strong>You’re all caught up</strong><small>New nearby requests will appear here automatically.</small>{jobNotice && <p>{jobNotice}</p>}</div> : <>
        <div className="nav-job-title"><span><VehicleArtwork bodyType={activeJob.bodyType} name={activeJob.car} /></span><div><small>{stage === "navigating" ? "NAVIGATING TO LOCATION" : "ARRIVAL CONFIRMED"}</small><strong>{activeJob.location}</strong><p>{activeJob.car} · {activeJob.type}</p></div><b>£{formatMoney(activeJob.payout)}</b></div>
        <div className="customer-notified"><span>✓</span><div><strong>Customer notified</strong><small>Approximate ETA: {activeJob.eta} · cross-checked with today’s schedule</small></div></div>
        <div className="nav-actions"><a href="https://www.google.com/maps/dir/?api=1&destination=OX1%201XX" target="_blank" rel="noreferrer">Open Google Maps</a><a href="https://www.waze.com/ul?q=OX1%201XX&navigate=yes" target="_blank" rel="noreferrer">Open Waze</a></div>
        <div
          ref={arrivalTrackRef}
          className={`arrival-slider ${arrivalDragging ? "dragging" : ""} ${arrival >= 100 ? "complete" : ""}`}
          style={{ "--arrival-progress": `${arrival}%` } as React.CSSProperties}
        >
          <span>{arrival >= 100 ? "Arrival confirmed" : arrivalDragging ? "Keep sliding →" : "Slide to confirm arrival"}</span>
          <button
            className="arrival-thumb"
            type="button"
            role="slider"
            aria-label="Slide to confirm arrival"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(arrival)}
            aria-valuetext={arrival >= 100 ? "Arrival confirmed" : `${Math.round(arrival)}% complete`}
            disabled={arrival >= 100}
            style={{ left: `calc(${arrival}% + ${6 - arrival * 0.66}px)` }}
            onPointerDown={(event) => {
              if (arrival >= 100) return;
              event.preventDefault();
              arrivalStartXRef.current = event.clientX;
              arrivalStartValueRef.current = arrivalValueRef.current;
              event.currentTarget.setPointerCapture(event.pointerId);
              setArrivalDragging(true);
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              event.preventDefault();
              updateArrivalDrag(event.clientX);
            }}
            onPointerUp={(event) => finishArrivalDrag(event.currentTarget, event.pointerId)}
            onPointerCancel={(event) => cancelArrivalDrag(event.currentTarget, event.pointerId)}
            onKeyDown={(event) => {
              let next = arrivalValueRef.current;
              if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.min(100, next + 10);
              else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = Math.max(0, next - 10);
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = 100;
              else return;
              event.preventDefault();
              arrivalValueRef.current = next;
              if (next >= 100) confirmArrival();
              else setArrival(next);
            }}
          >{arrival >= 100 ? "✓" : "→"}</button>
        </div>
      </>}
    </section>
  </div>;

  const bookingCountForDay = (day: number) => {
    const key = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const base = (SCHEDULE_BOOKINGS[key] || []).filter((item) => !(customerBooking && key === customerBookingDateKey && item.reg === customerBooking.reg)).length;
    return base + (customerBooking && key === customerBookingDateKey ? 1 : 0);
  };

  const Schedule = () => <div className="detailer-scroll schedule-screen"><Header eyebrow="YOUR AVAILABILITY" title="Schedule" />
    <section className="master-hours-card">
      <div><Step>REGULAR WORKING HOURS</Step><h3>{workingDays.join(" · ")}</h3><p>{masterHours.start}–{masterHours.end}</p></div>
      <button onClick={() => { setHoursDraft({ available: true, ...masterHours }); setHoursEditor("master"); }}>Edit</button>
    </section>
    <section className="month-summary"><span><small>{calendarOffset < 0 ? "HISTORICAL RECORD" : calendarOffset === 0 ? "THIS MONTH" : "FORWARD SCHEDULE"}</small><strong>{monthBookings.length} {monthBookings.length === 1 ? "job" : "jobs"}</strong></span><span><small>{calendarOffset < 0 ? "EARNED" : "PAY BOOKED"}</small><strong>£{monthPayout}</strong></span></section>
    <section className="calendar-card">
      <header><button disabled={calendarOffset <= minimumCalendarOffset} onClick={() => { setCalendarOffset((value) => Math.max(minimumCalendarOffset, value - 1)); setSelectedDay(1); }}>‹</button><strong>{calendarLabel}</strong><button disabled={calendarOffset >= maximumCalendarOffset} onClick={() => { setCalendarOffset((value) => Math.min(maximumCalendarOffset, value + 1)); setSelectedDay(1); }}>›</button></header>
      <div className="weekdays">{["M","T","W","T","F","S","S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="calendar-grid">
        {Array.from({ length: mondayStartOffset }).map((_, index) => <i key={`blank-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
          const count = bookingCountForDay(day);
          return <button key={day} className={`${selectedDay === day ? "selected" : ""} ${count ? "booked-day" : ""}`} onClick={() => setSelectedDay(day)}><span>{day}</span>{count > 0 && <b>{count}</b>}</button>;
        })}
      </div>
      <div className="calendar-key"><span><i /> Number of bookings</span><small>History from Mar 2026 · forward to Oct 2026</small></div>
    </section>
    <section className="day-agenda">
      <header><div><Step>{new Date(calendarYear, calendarMonth, selectedDay).toLocaleDateString("en-GB", { weekday: "long" }).toUpperCase()}</Step><h3>{selectedDay} {calendarDate.toLocaleDateString("en-GB", { month: "long" })}</h3></div><button onClick={() => {
        setHoursDraft(selectedOverride || { available: true, start: masterHours.start, end: masterHours.end });
        setHoursEditor("day");
      }}>Edit hours</button></header>
      <div className={`day-hours ${selectedOverride?.available === false ? "closed" : ""}`}><span>◷</span><strong>{selectedOverride ? selectedOverride.available ? `${selectedOverride.start}–${selectedOverride.end}` : "Unavailable" : `${masterHours.start}–${masterHours.end}`}</strong><small>{selectedOverride ? "Daily override" : "Using regular hours"}</small></div>
      {selectedScheduleJobs.length ? <div className="agenda-list">{selectedScheduleJobs.map((booking) => <article key={booking.id}>
        <time>{booking.time}</time><div><strong>{booking.service}</strong><p>{booking.car} · {booking.reg}</p><small>{booking.customer} · {booking.location} · {booking.duration}</small></div><b>£{booking.payout}</b>
        <div className="agenda-actions">
          <button onClick={() => setDetailerJobRecord(recordForBooking(booking, `${selectedDay} ${calendarDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })} · ${booking.time}`, selectedDayIsPast))}>View job</button>
          {selectedDayIsPast ? <span className="completed-booking">✓ Completed</span> : <button className={onWayBooking === booking.id ? "sent" : ""} onClick={() => { setOnWayBooking(booking.id); onCustomerEnRoute(18); }}>{onWayBooking === booking.id ? "✓ Customer notified" : "On my way"}</button>}
        </div>
      </article>)}</div> : <div className="empty-agenda"><span>◷</span><strong>No bookings</strong><small>This day is clear within your available hours.</small></div>}
    </section>
    <p className="schedule-note">Completed-job history remains available from your start date. You can also manage availability and bookings up to three months ahead. Travel estimates remain approximate.</p>
  </div>;

  const Activity = () => <div className="detailer-scroll"><Header eyebrow="YOUR WORK" title="Activity" />
    <div className="earnings-card"><small>THIS WEEK</small><strong>£438</strong><span>8 completed jobs · 4.98 average rating</span></div>
    <p className="activity-intro">Open any completed job to view its photographs, condition record and billing statement.</p>
    {ACTIVITY_BOOKINGS.map((record, index) => <button className="detailer-history" key={record.booking.id} onClick={() => setDetailerJobRecord(record)}><span>{index === 0 ? "Today" : index === 1 ? "Yesterday" : "26 Jul"}</span><div><b>{record.booking.service}</b><small>{record.booking.car}</small></div><strong>£{record.booking.payout}</strong><i>›</i></button>)}
  </div>;

  const Rewards = () => <div className="detailer-scroll"><Header eyebrow="AFFILIATE REWARDS" title="Rewards" />
    <div className="points-card"><span>AVAILABLE POINTS</span><strong>1,840</strong><small>Redeem against company-approved supplies</small></div>
    <div className="affiliate-panel"><Step>YOUR UNIQUE CODE</Step><label><input value={affiliateCode} onChange={(event) => setAffiliateCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /><button onClick={() => navigator.clipboard?.writeText(affiliateCode)}>Copy</button></label><p>New customers receive 10% off their first service. You earn affiliate points after their first completed job.</p></div>
    <h3 className="supply-title">Supplies marketplace</h3>
    <div className="supply-grid">{[["Snow foam 5L", "620 pts"], ["Microfibre pack", "480 pts"], ["Wheel cleaner", "740 pts"], ["Interior kit", "1,100 pts"]].map((item) => <button key={item[0]}><span>✦</span><b>{item[0]}</b><small>{item[1]}</small></button>)}</div>
  </div>;

  const detailerEditor = detailerEdit ? {
    name: { title: "Edit profile name", label: "Display name", value: detailerProfile.name, type: "text" },
    email: { title: "Edit email", label: "Email address", value: detailerProfile.email, type: "email" },
    phone: { title: "Edit phone", label: "Mobile number", value: detailerProfile.phone, type: "tel" },
    water: { title: "Water supply status", label: "Do you carry transportable water?", value: detailerProfile.specialist ? "Yes" : "No", type: "text", choices: ["Yes", "No"] },
    radius: { title: "Edit working radius", label: "Maximum travel distance (miles)", value: detailerProfile.radius, type: "number" },
    instagram: { title: "Edit Instagram portfolio", label: "Instagram handle", value: detailerProfile.instagram, type: "text" },
    vat: { title: "Edit VAT status", label: "VAT number, or enter Not registered", value: detailerProfile.vatRegistered ? detailerProfile.vatNumber : "Not registered", type: "text" },
  }[detailerEdit] : null;

  const saveDetailerEdit = (value: string) => {
    const cleanValue = value.trim();
    if (!cleanValue || !detailerEdit) return;
    setDetailerProfile((current) => ({
      ...current,
      ...(detailerEdit === "name" ? { name: cleanValue } : {}),
      ...(detailerEdit === "email" ? { email: cleanValue } : {}),
      ...(detailerEdit === "phone" ? { phone: cleanValue } : {}),
      ...(detailerEdit === "water" ? { specialist: cleanValue === "Yes" } : {}),
      ...(detailerEdit === "radius" ? { radius: cleanValue } : {}),
      ...(detailerEdit === "instagram" ? { instagram: cleanValue } : {}),
      ...(detailerEdit === "vat" ? cleanValue.toLowerCase() === "not registered" ? { vatRegistered: false, vatNumber: "" } : { vatRegistered: true, vatNumber: cleanValue.toUpperCase() } : {}),
    }));
    setDetailerEdit(null);
  };

  const Account = () => <div className="detailer-scroll"><Header eyebrow="DETAILER PROFILE" title="Account" />
    <button className="profile detailer-profile editable-profile" onClick={() => setDetailerEdit("name")}><span>{detailerProfile.name.split(" ").map((part) => part[0]).join("").slice(0,2)}</span><div><h2>{detailerProfile.name}</h2><p>★ 4.98 · 326 completed jobs</p><b>{detailerProfile.specialist ? "◈ Water supply specialist" : "Standard detailer"}</b></div><strong>Edit</strong></button>
    <button className="instagram-card" onClick={() => setDetailerEdit("instagram")}><span>◎</span><label>Instagram portfolio<strong>{detailerProfile.instagram}</strong></label><b>Edit</b></button>
    <section className="platform-pricing-card"><span>⌁</span><div><Step>PLATFORM PRICING</Step><h3>Your pay is calculated per job</h3><p>ValX calculates each offer from the service, vehicle type, predicted duration and travel distance. The amount shown on the job map is the amount paid to you.</p></div></section>
    {[
      ["☎", "Phone", detailerProfile.phone, "phone"],
      ["✉", "Email", detailerProfile.email, "email"],
      ["◈", "Transportable water supply", detailerProfile.specialist ? "Yes · specialist jobs enabled" : "No · specialist jobs hidden", "water"],
      ["⌖", "Working radius", `Up to ${detailerProfile.radius} miles`, "radius"],
      ["▤", "VAT status", detailerProfile.vatRegistered ? `Registered · ${detailerProfile.vatNumber || "number required"}` : "Not VAT registered", "vat"],
    ].map(([icon, name, detail, edit]) => <button className="setting" key={name} onClick={() => setDetailerEdit(edit as DetailerEdit)}><span>{icon}</span><span><strong>{name}</strong><small>{detail}</small></span><b>›</b></button>)}
    <button className="setting" onClick={() => setPayoutOpen(true)}><span>▱</span><span><strong>Payout bank account</strong><small>•••• {detailerBank.accountNumber.slice(-4)} · Instant payouts</small></span><b>›</b></button>
    <div className="instant-payout-note"><span>⚡</span><div><strong>Agreed subcontractor pay</strong><small>The guaranteed amount offered by ValX before you accept is sent in full when the job is completed.</small></div></div>
    <div className="support-contact"><span>PROTOTYPE SUPPORT EMAIL · NOT MONITORED</span><strong>{DETAILER_SUPPORT_EMAIL}</strong><small>Detailer support placeholder</small></div>
    <button className="sign-out" onClick={signOut}>Sign out</button>
  </div>;

  return <main className="app-shell detailer-shell">
    <div className="ambient one" /><div className="ambient two" />
      <section className="phone detailer-phone" aria-label="Detailer app proof of concept">
      <div className="status"><span>9:41</span><span>▮▮▮ ᯤ 93</span></div>
      {tab === "jobs" && renderJobs()}{tab === "schedule" && <Schedule />}{tab === "activity" && <Activity />}{tab === "rewards" && <Rewards />}{tab === "account" && <Account />}
      <nav className="nav detailer-nav">{[["jobs","⌖","Jobs"],["schedule","□","Schedule"],["activity","◷","Activity"],["rewards","◇","Rewards"],["account","◎","Account"]].map(([id, icon, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id as DetailerTab)}><b>{icon}</b><span>{label}</span></button>)}</nav>
      {(stage === "before" || stage === "working" || stage === "after") && <section className="job-process">
        <header><button onClick={() => setStage("navigating")}>‹</button><div><small>£{formatMoney(activeJob.payout)} GUARANTEED PAY</small><strong>{activeJob.car}</strong></div><span>{stage === "before" ? "Arrival check" : stage === "working" ? "Job in progress" : "Final check"}</span></header>
        {stage === "before" && <EvidenceStep phase="Before you start" lead="Photograph the vehicle and record any existing blemishes before work begins." count={beforePhotos} setCount={setBeforePhotos} blemish={blemishLogged} setBlemish={setBlemishLogged} />}
        {stage === "before" && <button className="process-cta" disabled={beforePhotos < 3} onClick={() => setStage("working")}>Start job <span>→</span></button>}
        {stage === "working" && <div className="working-view"><span className="working-icon">✦</span><Step>JOB IN PROGRESS</Step><h2>{activeJob.type}</h2><p>{activeJob.car} · {activeJob.location}</p><div className="timer">00:48:16</div><div className="job-checks"><span>✓ Arrival recorded</span><span>✓ Before photos saved</span><span>{blemishLogged ? "✓ Blemish notes attached" : "— No blemishes recorded"}</span></div><button className="process-cta" onClick={() => setStage("after")}>Finish job</button></div>}
        {stage === "after" && <EvidenceStep phase="Show the finished work" lead="Take clear final photos before leaving the customer’s location." count={afterPhotos} setCount={setAfterPhotos} />}
        {stage === "after" && <button className="process-cta" disabled={afterPhotos < 3} onClick={() => setStage("complete")}>Complete job <span>✓</span></button>}
      </section>}
      {stage === "complete" && <section className="pay-complete"><div className="pay-check">✓</div><Step>JOB COMPLETE · PAYMENT SENT</Step><h1>Here is your pay</h1><strong>£{formatMoney(activeJob.payout)}</strong><p>Paid immediately to bank account •••• {detailerBank.accountNumber.slice(-4)}</p><div className="instant-paid"><span>⚡</span><div><b>Full displayed pay transferred</b><small>No further fee was deducted at payout.</small></div></div><button className="document-link completion-document" onClick={() => setDocumentOpen(true)}><span>▤</span><div><strong>View self-billing document</strong><small>Generated using your current VAT status</small></div><b>›</b></button><div className="nearby-next"><small>CLOSEST AVAILABLE JOBS</small>{availableJobs.filter((job) => job.id !== activeJob.id).slice(0,3).map((job) => <button key={job.id} onClick={() => finishAndReset(job.id)}><span><VehicleArtwork bodyType={job.bodyType} name={job.car} /></span><div><b>{job.type}</b><small>{job.distance} · {job.location}</small></div><strong>£{formatMoney(job.payout)}</strong></button>)}</div><button className="secondary" onClick={() => finishAndReset()}>Back to job map</button></section>}
      {detailerJobRecord && <section className="job-detail-view detailer-job-record">
        <header><button onClick={() => setDetailerJobRecord(null)}>‹</button><strong>Job record</strong><span /></header>
        <div className="job-detail-scroll">
          <Step>{detailerJobRecord.completed ? "COMPLETED JOB" : "UPCOMING JOB"}</Step>
          <h1>{detailerJobRecord.booking.service}</h1>
          <p className="job-detail-sub">{detailerJobRecord.booking.car} · {detailerJobRecord.booking.reg}</p>
          <section className="detailer-record-summary">
            <div><small>DATE & TIME</small><strong>{detailerJobRecord.dateLabel}</strong></div>
            <div><small>CUSTOMER</small><strong>{detailerJobRecord.booking.customer}</strong></div>
            <div><small>LOCATION</small><strong>{detailerJobRecord.booking.location}</strong></div>
            <div><small>{detailerJobRecord.completed ? "TAKE-HOME PAID" : "GUARANTEED PAY"}</small><strong>£{formatMoney(detailerJobRecord.booking.payout)}</strong></div>
          </section>
          {detailerJobRecord.completed ? <>
            <h3 className="evidence-heading">Before photographs</h3>
            <div className="customer-photo-grid detailer-evidence">{detailerJobRecord.beforePhotos.map((label, index) => <button key={label}><span>{index === 2 ? "◈" : "🚘"}</span><small>{label}</small><b>Saved</b></button>)}</div>
            <div className="blemish-record"><span>✓</span><div><strong>Condition record preserved</strong><small>{detailerJobRecord.blemishSummary}</small></div></div>
            <h3 className="evidence-heading">After photographs</h3>
            <div className="customer-photo-grid after detailer-evidence">{detailerJobRecord.afterPhotos.map((label, index) => <button key={label}><span>{index === 2 ? "✦" : "🚘"}</span><small>{label}</small><b>Saved</b></button>)}</div>
            <p className="photo-note">These are the photographs saved by you when this job was completed. They remain attached to this job record.</p>
            <button className="document-link" onClick={() => { setDocumentJob(detailerJobRecord); setDocumentOpen(true); }}><span>▤</span><div><strong>{detailerProfile.vatRegistered ? "View VAT self-billing invoice" : "View self-billing statement"}</strong><small>This job’s permanent billing document · £{formatMoney(detailerJobRecord.booking.payout)} paid in full</small></div><b>›</b></button>
          </> : <section className="future-record-note"><span>▤</span><div><strong>Billing statement available after completion</strong><small>Your guaranteed pay is already fixed. The statement and photographs will be attached here once the job is completed.</small></div></section>}
        </div>
      </section>}
      {detailerEditor && <AccountEditSheet
        title={detailerEditor.title}
        label={detailerEditor.label}
        initialValue={detailerEditor.value}
        type={detailerEditor.type}
        choices={"choices" in detailerEditor ? detailerEditor.choices : undefined}
        onClose={() => setDetailerEdit(null)}
        onSave={saveDetailerEdit}
      />}
      {payoutOpen && <BankAccountSheet
        title="Instant payout account"
        lead="The earnings shown when you accept a job are sent to this bank account in full immediately after completion."
        bank={detailerBank}
        onClose={() => setPayoutOpen(false)}
        onSave={(bank) => {
          setDetailerBank(bank);
          setPayoutOpen(false);
        }}
      />}
      {documentOpen && <SelfBillingDocument
        detailerName={detailerProfile.name}
        vatRegistered={detailerProfile.vatRegistered}
        vatNumber={detailerProfile.vatNumber}
        service={documentJob?.booking.service || activeJob.type}
        vehicle={documentJob ? `${documentJob.booking.car} · ${documentJob.booking.reg}` : activeJob.car}
        grossPay={documentJob?.booking.payout || activeJob.payout}
        documentNumber={`SB-${(documentJob?.booking.id || `job-${activeJob.id}`).replace(/[^a-z0-9]/gi, "").toUpperCase()}`}
        taxPoint={documentJob?.dateLabel || "29 July 2026"}
        onClose={() => { setDocumentOpen(false); setDocumentJob(null); }}
      />}
      {hoursEditor && <AvailabilityEditor
        mode={hoursEditor}
        dateLabel={`${selectedDay} ${calendarDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`}
        workingDays={workingDays}
        setWorkingDays={setWorkingDays}
        value={hoursDraft}
        setValue={setHoursDraft}
        onClose={() => setHoursEditor(null)}
        onSave={() => {
          if (hoursEditor === "master") setMasterHours({ start: hoursDraft.start, end: hoursDraft.end });
          else setDayOverrides((current) => ({ ...current, [selectedDateKey]: hoursDraft }));
          setHoursEditor(null);
        }}
        onClear={hoursEditor === "day" ? () => {
          setDayOverrides((current) => { const next = { ...current }; delete next[selectedDateKey]; return next; });
          setHoursEditor(null);
        } : undefined}
      />}
    </section>
  </main>;
}

function formatSortCode(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  return digits.match(/.{1,2}/g)?.join("-") || "";
}

function formatMoney(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
}

function PaymentMethodSheet({ method, bank, onClose, onSave }: {
  method: PaymentKind;
  bank: BankDetails;
  onClose: () => void;
  onSave: (method: PaymentKind, bank: BankDetails) => void;
}) {
  const [selected, setSelected] = useState<PaymentKind>(method);
  const [draft, setDraft] = useState(bank);
  const bankValid = draft.accountName.trim().length > 2 && draft.sortCode.replace(/\D/g, "").length === 6 && draft.accountNumber.replace(/\D/g, "").length === 8;
  const choices: { id: PaymentKind; icon: string; note: string }[] = [
    { id: "Bank account", icon: "▱", note: "Pay securely from a UK bank account" },
    { id: "Apple Pay", icon: "●", note: "Use the cards in your Apple Wallet" },
    { id: "Google Pay", icon: "G", note: "Use a saved Google Wallet method" },
    { id: "PayPal", icon: "P", note: "Continue with your PayPal account" },
  ];
  return <div className="account-edit-scrim" onClick={onClose}>
    <section className="account-edit-sheet payment-sheet" role="dialog" aria-modal="true" aria-label="Payment methods" onClick={(event) => event.stopPropagation()}>
      <i className="handle" />
      <header><div><Step>PAYMENT SETTINGS</Step><h2>Choose how to pay</h2></div><button onClick={onClose}>×</button></header>
      <p>Your selected method is charged once after you review and confirm a booking. The complete upfront total includes the £3.99 service fee.</p>
      <div className="payment-options">{choices.map((choice) => <button className={selected === choice.id ? "selected" : ""} key={choice.id} onClick={() => setSelected(choice.id)}><span>{choice.icon}</span><div><strong>{choice.id}</strong><small>{choice.note}</small></div><b>{selected === choice.id ? "✓" : ""}</b></button>)}</div>
      {selected === "Bank account" && <BankFields bank={draft} setBank={setDraft} />}
      {selected !== "Bank account" && <div className="wallet-ready"><span>✓</span><div><strong>{selected} ready to connect</strong><small>The production app will open the provider’s secure approval screen.</small></div></div>}
      <button className="save-edit" disabled={selected === "Bank account" && !bankValid} onClick={() => onSave(selected, draft)}>Use this payment method</button>
    </section>
  </div>;
}

function BankFields({ bank, setBank }: { bank: BankDetails; setBank: (bank: BankDetails) => void }) {
  return <fieldset className="bank-fields"><legend>UK bank account</legend><label>Account holder<input value={bank.accountName} onChange={(event) => setBank({ ...bank, accountName: event.target.value })} placeholder="Name on account" autoComplete="name" /></label><div><label>Sort code<input inputMode="numeric" value={bank.sortCode} onChange={(event) => setBank({ ...bank, sortCode: formatSortCode(event.target.value) })} placeholder="00-00-00" maxLength={8} /></label><label>Account number<input inputMode="numeric" value={bank.accountNumber} onChange={(event) => setBank({ ...bank, accountNumber: event.target.value.replace(/\D/g, "").slice(0, 8) })} placeholder="12345678" maxLength={8} /></label></div><small>Bank details are encrypted and never shown in full.</small></fieldset>;
}

function BankAccountSheet({ title, lead, bank, onClose, onSave }: {
  title: string;
  lead: string;
  bank: BankDetails;
  onClose: () => void;
  onSave: (bank: BankDetails) => void;
}) {
  const [draft, setDraft] = useState(bank);
  const valid = draft.accountName.trim().length > 2 && draft.sortCode.replace(/\D/g, "").length === 6 && draft.accountNumber.replace(/\D/g, "").length === 8;
  return <div className="account-edit-scrim" onClick={onClose}>
    <section className="account-edit-sheet payment-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
      <i className="handle" />
      <header><div><Step>PAYOUT SETTINGS</Step><h2>{title}</h2></div><button onClick={onClose}>×</button></header>
      <p>{lead}</p>
      <div className="commission-banner payout-banner"><span>✓</span><div><strong>Guaranteed pay</strong><small>The amount shown before accepting a job is transferred in full after completion.</small></div></div>
      <BankFields bank={draft} setBank={setDraft} />
      <button className="save-edit" disabled={!valid} onClick={() => onSave(draft)}>Save payout account</button>
    </section>
  </div>;
}

function AvailabilityEditor({ mode, dateLabel, workingDays, setWorkingDays, value, setValue, onClose, onSave, onClear }: {
  mode: "master" | "day";
  dateLabel: string;
  workingDays: string[];
  setWorkingDays: (days: string[]) => void;
  value: { available: boolean; start: string; end: string };
  setValue: (value: { available: boolean; start: string; end: string }) => void;
  onClose: () => void;
  onSave: () => void;
  onClear?: () => void;
}) {
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return <div className="account-edit-scrim" onClick={onClose}>
    <section className="account-edit-sheet hours-editor" role="dialog" aria-modal="true" aria-label={mode === "master" ? "Regular working hours" : `Availability for ${dateLabel}`} onClick={(event) => event.stopPropagation()}>
      <i className="handle" />
      <header><div><Step>{mode === "master" ? "MASTER AVAILABILITY" : "DAILY OVERRIDE"}</Step><h2>{mode === "master" ? "Regular working hours" : dateLabel}</h2></div><button onClick={onClose}>×</button></header>
      {mode === "master" ? <><p>Choose the days you usually work. You can still override any individual date from the calendar.</p><div className="working-day-picker">{weekdays.map((day) => <button className={workingDays.includes(day) ? "selected" : ""} key={day} onClick={() => setWorkingDays(workingDays.includes(day) ? workingDays.filter((item) => item !== day) : [...workingDays, day])}>{day}<span>{workingDays.includes(day) ? "✓" : ""}</span></button>)}</div></> :
      <div className="availability-toggle"><button className={value.available ? "selected" : ""} onClick={() => setValue({ ...value, available: true })}>Available</button><button className={!value.available ? "selected closed" : ""} onClick={() => setValue({ ...value, available: false })}>Not working</button></div>}
      {(mode === "master" || value.available) && <div className="time-fields"><label>Start time<input type="time" value={value.start} onChange={(event) => setValue({ ...value, start: event.target.value })} /></label><span>to</span><label>Finish time<input type="time" value={value.end} onChange={(event) => setValue({ ...value, end: event.target.value })} /></label></div>}
      <button className="save-edit" disabled={mode === "master" && workingDays.length === 0} onClick={onSave}>Save availability</button>
      {onClear && <button className="clear-override" onClick={onClear}>Use regular hours instead</button>}
    </section>
  </div>;
}

function AccountEditSheet({ title, label, initialValue, type, choices, onClose, onSave }: {
  title: string;
  label: string;
  initialValue: string;
  type: string;
  choices?: string[];
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return <div className="account-edit-scrim" onClick={onClose}>
    <section className="account-edit-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
      <i className="handle" />
      <header><div><Step>ACCOUNT SETTINGS</Step><h2>{title}</h2></div><button onClick={onClose}>×</button></header>
      {choices ? <div className="edit-choices">{choices.map((choice) => <button className={value === choice ? "selected" : ""} key={choice} onClick={() => setValue(choice)}>{choice}<span>{value === choice ? "✓" : ""}</span></button>)}</div> :
        <label className="edit-field">{label}<input autoFocus type={type} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSave(value)} /></label>}
      <button className="save-edit" disabled={!value.trim()} onClick={() => onSave(value)}>Save changes</button>
    </section>
  </div>;
}

function EvidenceStep({ phase, lead, count, setCount, blemish, setBlemish }: { phase: string; lead: string; count: number; setCount: (count: number) => void; blemish?: boolean; setBlemish?: (value: boolean) => void }) {
  return <div className="evidence"><Step>VEHICLE EVIDENCE</Step><h1>{phase}</h1><p>{lead}</p><div className="photo-grid">{[0,1,2].map((index) => <button className={index < count ? "added" : ""} key={index} onClick={() => setCount(Math.max(count, index + 1))}><span>{index < count ? "✓" : "＋"}</span><small>{index === 0 ? "Front" : index === 1 ? "Rear" : "Side"}</small></button>)}</div>{setBlemish && <button className={`blemish-toggle ${blemish ? "active" : ""}`} onClick={() => setBlemish(!blemish)}><span>{blemish ? "✓" : "＋"}</span><div><b>{blemish ? "Blemishes highlighted" : "Highlight existing blemishes"}</b><small>{blemish ? "2 notes and photo markers saved" : "Add notes or mark damage before starting"}</small></div><strong>›</strong></button>}<small className="evidence-note">{count}/3 required photos added</small></div>;
}

function VehicleArtwork({ bodyType, name }: { bodyType: VehicleType; name: string }) {
  return <img className="vehicle-art" src={VEHICLE_IMAGES[bodyType]} alt={`${name} ${VEHICLE_TYPE_LABELS[bodyType].toLowerCase()}`} draggable={false} />;
}

function Header({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <header className="top"><div><small>{eyebrow}</small><h1>{title}</h1></div>{action}</header>;
}
function SectionHead({ eyebrow, title, onManage }: { eyebrow: string; title: string; onManage: () => void }) {
  return <div className="section-head"><div><small>{eyebrow}</small><h3>{title}</h3></div><button onClick={onManage}>Manage</button></div>;
}
function Step({ children }: { children: React.ReactNode }) { return <p className="step">{children}</p>; }
function Title({ title, lead }: { title: string; lead?: string }) { return <><h2 className="flow-title">{title}</h2>{lead && <p className="lead">{lead}</p>}</>; }
function CTA({ children, onClick, sticky }: { children: React.ReactNode; onClick: () => void; sticky?: boolean }) { return <button className={`cta ${sticky ? "sticky" : ""}`} onClick={onClick}>{children}<span>→</span></button>; }
function ModeCard({ icon, title, text, recommended, onClick }: { icon: string; title: string; text: string; recommended?: boolean; onClick: () => void }) {
  return <button className={recommended ? "recommended" : ""} onClick={onClick}>{recommended && <em>FASTEST</em>}<span className="mode-icon">{icon}</span><span><strong>{title}</strong><small>{text}</small></span><b>›</b></button>;
}
function Avatar({ person, large }: { person: typeof VALETERS[number]; large?: boolean }) { return <span className={`person ${person.tone} ${large ? "large" : ""}`}>{person.initials}</span>; }
function Picker({ label, values, value, setValue, grid }: { label: string; values: string[]; value: string; setValue: (v: string) => void; grid?: boolean }) {
  return <><h3 className="picker-label">{label}</h3><div className={grid ? "picker grid" : "picker"}>{values.map((item) => <button className={value === item ? "selected" : ""} key={item} onClick={() => setValue(item)}>{item}</button>)}</div></>;
}
function ReviewRow({ label, value, sub }: { label: string; value: string; sub?: string }) { return <div><span>{label}</span><strong>{value}{sub && <small>{sub}</small>}</strong></div>; }
function HistoryCard({ upcoming, date, time, service, vehicle, person, price, status, eta, onClick }: { upcoming?: boolean; date: string; time: string; service: string; vehicle: string; person: typeof VALETERS[number]; price: number; status?: BookingStatus; eta?: number; onClick?: () => void }) {
  return <button className={`history-card ${upcoming ? "current" : ""}`} onClick={onClick}><div className="history-date"><strong>{date}</strong><span>{time}</span></div><div className="history-main"><em>{upcoming ? status === "on-way" ? "ON THE WAY" : "UPCOMING" : "COMPLETED"}</em><h3>{service}</h3><p>{vehicle}</p><div><Avatar person={person} /><span>{person.name}<small>{upcoming ? status === "on-way" ? `Approximately ${eta} min away · live estimate` : `★ ${person.rating} · notification pending` : "★★★★★ · Your rating"}</small></span></div>{upcoming && <p className="history-eta-note">Times are approximate and may change with traffic or the detailer’s schedule.</p>}</div><span className="history-tail"><b className="history-price">£{price}</b><i>›</i></span></button>;
}

function AuthScreen({ role, setRole, mode, setMode, form, setForm, error, submit }: {
  role: Role | null;
  setRole: (role: Role | null) => void;
  mode: "signin" | "signup";
  setMode: (mode: "signin" | "signup") => void;
  form: AuthForm;
  setForm: (form: AuthForm) => void;
  error: string;
  submit: () => void;
}) {
  const update = (key: keyof typeof form, value: string | boolean) => setForm({ ...form, [key]: value });
  const chooseRole = (nextRole: Role) => {
    setRole(nextRole);
  };
  return <main className="app-shell auth-shell">
    <div className="ambient one" /><div className="ambient two" />
    <section className="phone auth-phone" aria-label="ValX account preview">
      <div className="status"><span>9:41</span><span>▮▮▮ ᯤ 93</span></div>
      <div className="auth-content">
        <div className="auth-brand"><img src="/valx-logo.png" alt="ValX" /></div>
        <div className="role-switch" aria-label="Choose account type">
          <button type="button" className={role === "customer" ? "active" : ""} aria-pressed={role === "customer"} onClick={() => chooseRole("customer")}><span>🚘</span>Customer</button>
          <button type="button" className={role === "detailer" ? "active" : ""} aria-pressed={role === "detailer"} onClick={() => chooseRole("detailer")}><span>✦</span>Detailer</button>
          <button type="button" className={role === "admin" ? "active" : ""} aria-pressed={role === "admin"} onClick={() => { chooseRole("admin"); setMode("signin"); }}><span>⌾</span>Admin</button>
        </div>
        <small className="role-preview-note">PROTOTYPE ROLE PREVIEW · Production accounts will open only their assigned experience.</small>
        <div className="auth-copy">
          <p>{role === "admin" ? "APPROVED ACCOUNTS ONLY" : mode === "signup" ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}</p>
          <h1>{role === "admin" ? "Run ValX securely." : role === "detailer" ? (mode === "signup" ? "Start earning nearby." : "Ready for your next job?") : role === "customer" ? (mode === "signup" ? "Your garage starts here." : "Ready for a cleaner car?") : "How will you use ValX?"}</h1>
          <span>{role === "admin" ? "Open the separate private operations portal. Approved identity, MFA and staff permissions are required." : role === "detailer" ? "Open your local job map, manage work and track earnings." : role === "customer" ? (mode === "signup" ? "Link your details before adding vehicles and service addresses." : "Sign in to open your garage and manage your bookings.") : "Preview the Customer, Detailer and Admin account journeys for your client."}</span>
        </div>
        {role !== "admin" && <div className="auth-tabs">
          <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
        </div>}
        <div className="auth-form">
          {mode === "signup" && <label>Full name<input autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your full name" /></label>}
          <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" /></label>
          {mode === "signup" && <label>Mobile number<input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="e.g. 07700 900123" /></label>}
          {mode === "signup" && role === "customer" && <label>Affiliate code <small>Optional · 10% off your first service</small><input value={form.affiliate} onChange={(e) => update("affiliate", e.target.value.toUpperCase())} placeholder="Enter a detailer's code" /></label>}
          {mode === "signup" && role === "detailer" && <label>Instagram portfolio <small>Shown to customers viewing your work</small><input value={form.instagram} onChange={(e) => update("instagram", e.target.value)} placeholder="@your.detailing" /></label>}
          {mode === "signup" && role === "detailer" && <div className="water-signup"><span><b>Do you carry your own transportable water supply?</b><small>Detailers who answer yes are shown as specialists and can accept no-water jobs.</small></span><div><button className={form.ownWater ? "active" : ""} onClick={() => update("ownWater", true)}>Yes</button><button className={!form.ownWater ? "active" : ""} onClick={() => update("ownWater", false)}>No</button></div></div>}
          {mode === "signup" && role === "detailer" && <div className="water-signup vat-signup"><span><b>Are you VAT registered?</b><small>This determines whether we create a VAT self-billing invoice or a non-VAT self-billing statement.</small></span><div><button className={form.vatRegistered ? "active" : ""} onClick={() => update("vatRegistered", true)}>Yes</button><button className={!form.vatRegistered ? "active" : ""} onClick={() => { update("vatRegistered", false); setForm({ ...form, vatRegistered: false, vatNumber: "" }); }}>No</button></div></div>}
          {mode === "signup" && role === "detailer" && form.vatRegistered && <label>VAT registration number <small>Required for VAT self-billing</small><input value={form.vatNumber} onChange={(e) => update("vatNumber", e.target.value.toUpperCase())} placeholder="GB 123 4567 89" /></label>}
          {mode === "signup" && role === "detailer" && <fieldset className="signup-bank"><legend>Instant payout bank account</legend><small>The earnings shown when you select a job are sent here in full immediately after completion.</small><label>Account holder<input autoComplete="name" value={form.bankName} onChange={(e) => update("bankName", e.target.value)} placeholder="Name on account" /></label><div><label>Sort code<input inputMode="numeric" value={form.sortCode} onChange={(e) => update("sortCode", formatSortCode(e.target.value))} placeholder="00-00-00" maxLength={8} /></label><label>Account number<input inputMode="numeric" value={form.accountNumber} onChange={(e) => update("accountNumber", e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="12345678" maxLength={8} /></label></div></fieldset>}
          <label>Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && submit()} /></label>
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-submit" onClick={submit}>{role === "admin" ? "Open secure admin portal" : mode === "signup" ? `Create ${role ? `${role} ` : ""}account` : `Sign in${role ? ` as ${role}` : ""}`}<span>→</span></button>
          {mode === "signin" && <small className="demo-hint">{role === "admin" ? "The admin portal remains private and checks its own approved-account list." : "Choose the account experience you want to demonstrate. Production access will be assigned by the account."}</small>}
        </div>
        <p className="auth-terms">{role === "admin" ? "Administrative access is monitored and recorded." : role === "detailer" && mode === "signup" ? "By continuing, you agree to the detailer subcontractor terms, privacy notice and prototype self-billing arrangement." : "By continuing, you agree to purchase booked services from ValX under the customer terms and privacy notice."}</p>
      </div>
    </section>
  </main>;
}

function PolicySheet({ onClose }: { onClose: () => void }) {
  return <div className="scrim" onClick={onClose}><section className="account-edit-sheet policy-sheet" role="dialog" aria-modal="true" aria-label="Booking and vehicle care policies" onClick={(event) => event.stopPropagation()}>
    <div className="sheet-title"><div><Step>ValX POLICIES</Step><h2>Before your visit</h2></div><button onClick={onClose}>×</button></div>
    <p>ValX is the legal supplier of the customer’s booked service and remains responsible for the booking, support, complaints and approved refunds. Any cancellation or rescheduling charge is shown before the customer confirms.</p>
    <div className="policy-list">
      <div><b>Cancellation & rescheduling</b><span>More than 24 hours before the appointment is free. Between 24 and 4 hours before, only the £3.99 service charge is retained. Less than 4 hours before, 50% of the job price is charged. The applicable amount is shown before confirmation.</span></div>
      <div><b>Customer no-shows</b><span>The detailer waits 15 minutes and attempts contact. After ValX reviews time-stamped evidence, the customer may be charged 50% of the job price.</span></div>
      <div><b>Weather</b><span>Unsafe weather can trigger a no-fault reschedule for both customer and detailer.</span></div>
      <div><b>Vehicle access</b><span>The vehicle must be accessible at the confirmed address, with keys available where interior access is required.</span></div>
      <div><b>Water & electricity</b><span>The booking records what is available. Jobs needing a self-supplied specialist are matched accordingly.</span></div>
      <div><b>Extraordinary condition</b><span>Pet hair, staining or excessive dirt is documented and any changed scope requires customer approval before work.</span></div>
      <div><b>Damage disputes</b><span>Timestamped before/after photos and the blemish record are retained with the job and linked to any complaint.</span></div>
    </div>
    <button className="save-edit" onClick={onClose}>Done</button>
  </section></div>;
}
