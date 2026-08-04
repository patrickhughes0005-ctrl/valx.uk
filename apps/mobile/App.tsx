import { brand } from "@valx/brand";
import {
  services,
  type ServiceId,
  type VehicleType
} from "@valx/pricing-policy";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { api, ApiError, session } from "./src/api";
import type {
  Address,
  Booking,
  Quote,
  Role,
  User,
  Vehicle
} from "./src/types";

const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP"
});

const errorCopy: Record<string, string> = {
  beta_invitation_required: "This private beta needs a valid invitation.",
  account_already_exists: "An account already exists for that email.",
  invalid_credentials: "The email or password is not recognised.",
  email_verification_required: "Verify your email address before signing in.",
  invalid_verification_token:
    "That verification link has expired or was already used.",
  invalid_password_reset:
    "That password reset link has expired or was already used.",
  invalid_or_expired_session: "Your session has expired. Please sign in again.",
  booking_reference_invalid: "Your quote expired. Please create a new quote.",
  booking_no_longer_available: "Another detailer has accepted this job.",
  request_failed: "ValX could not complete that request. Please try again."
};

const messageFor = (error: unknown) =>
  error instanceof ApiError
    ? errorCopy[error.code] ?? "ValX could not complete that request."
    : "ValX could not connect to the private beta.";

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={brand.colours.muted}
        style={[styles.input, props.multiline && styles.multiline]}
      />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled && styles.disabled]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function Choice<T extends string>({
  values,
  value,
  onChange,
  labels
}: {
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <View style={styles.choiceRow}>
      {values.map((item) => (
        <Pressable
          key={item}
          onPress={() => onChange(item)}
          style={[styles.choice, item === value && styles.choiceActive]}
        >
          <Text
            style={[
              styles.choiceText,
              item === value && styles.choiceTextActive
            ]}
          >
            {labels?.[item] ?? item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function BrandHeader({ detail }: { detail: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.mark}>
        <Text style={styles.markText}>V</Text>
      </View>
      <View>
        <Text style={styles.brand}>ValX</Text>
        <Text style={styles.kicker}>{detail.toUpperCase()}</Text>
      </View>
    </View>
  );
}

type AuthMode =
  | "signin"
  | "create"
  | "verification_sent"
  | "verify"
  | "forgot"
  | "reset";

function AuthScreen({
  onAuthenticated
}: {
  onAuthenticated: (user: User) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [role, setRole] = useState<Role>("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [actionToken, setActionToken] = useState("");
  const [water, setWater] = useState(true);
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatNumber, setVatNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const applyAuthLink = (url: string | null) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const action = parsed.hash
          ? new URL(parsed.hash.slice(1), "https://valx.local")
          : parsed;
        const token = action.searchParams.get("token");
        if (!token) return;
        setActionToken(token);
        setMode(action.pathname.includes("reset-password") ? "reset" : "verify");
      } catch {
        // Ignore malformed external links and keep the normal sign-in screen.
      }
    };
    if (Platform.OS === "web" && typeof window !== "undefined") {
      applyAuthLink(window.location.href);
    } else {
      void Linking.getInitialURL().then(applyAuthLink);
    }
    const subscription = Linking.addEventListener("url", ({ url }) => {
      applyAuthLink(url);
    });
    return () => subscription.remove();
  }, []);

  const submit = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "forgot") {
        await api("/v1/auth/forgot-password", {
          method: "POST",
          authenticated: false,
          body: { email }
        });
        setNotice(
          "If that address has a verified ValX account, a reset link is on its way."
        );
        return;
      }
      if (mode === "reset") {
        await api("/v1/auth/reset-password", {
          method: "POST",
          authenticated: false,
          body: { token: actionToken, password }
        });
        setActionToken("");
        setPassword("");
        setMode("signin");
        setNotice(
          "Your password has been changed. Sign in with the new password."
        );
        return;
      }
      if (mode === "verify") {
        const result = await api<{ token: string; user: User }>(
          "/v1/auth/verify-email",
          {
            method: "POST",
            authenticated: false,
            body: { token: actionToken }
          }
        );
        await session.set(result.token);
        onAuthenticated(result.user);
        return;
      }
      if (mode === "create") {
        await api<{ verificationRequired: true }>("/v1/auth/register", {
          method: "POST",
          authenticated: false,
          body:
            role === "customer"
              ? {
                  role,
                  name,
                  email,
                  phone,
                  password,
                  inviteCode,
                  waterAvailable: water
                }
              : {
                  role,
                  name,
                  email,
                  phone,
                  password,
                  inviteCode,
                  ownWaterSupply: water,
                  serviceRadiusMiles: 12,
                  vatRegistered,
                  vatNumber: vatRegistered ? vatNumber : undefined
                }
        });
        setMode("verification_sent");
        return;
      }
      const result = await api<{ token: string; user: User }>(
        "/v1/auth/login",
        {
          method: "POST",
          authenticated: false,
          body: { email, password }
        }
      );
      await session.set(result.token);
      onAuthenticated(result.user);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/v1/auth/resend-verification", {
        method: "POST",
        authenticated: false,
        body: { email }
      });
      setNotice(
        "If the account is waiting for verification, a fresh link is on its way."
      );
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  const title: Record<AuthMode, string> = {
    signin: "Welcome back",
    create: "Create your ValX account",
    verification_sent: "Check your email",
    verify: "Verify your email",
    forgot: "Reset your password",
    reset: "Choose a new password"
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <BrandHeader detail="Private beta" />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>INVITE-ONLY ACCESS</Text>
        <Text style={styles.heroTitle}>{title[mode]}</Text>
        <Text style={styles.body}>
          This pilot takes real booking requests but does not take payment.
        </Text>
      </View>

      {(mode === "signin" || mode === "create") && (
        <Choice
          values={["signin", "create"] as const}
          value={mode}
          onChange={setMode}
          labels={{ signin: "Sign in", create: "Create account" }}
        />
      )}
      {mode === "create" && (
        <>
          <Choice
            values={["customer", "detailer"] as const}
            value={role}
            onChange={setRole}
            labels={{ customer: "Customer", detailer: "Detailer" }}
          />
          <Field label="Full name" value={name} onChangeText={setName} />
          <Field
            label="Mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field
            label="Invitation code"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
          />
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.cardTitle}>
                {role === "customer"
                  ? "Outdoor water is available"
                  : "I carry my own water supply"}
              </Text>
              <Text style={styles.small}>
                This controls which detailers and jobs are eligible.
              </Text>
            </View>
            <Switch
              value={water}
              onValueChange={setWater}
              trackColor={{ true: brand.colours.primary }}
            />
          </View>
          {role === "detailer" && (
            <>
              <View style={styles.toggleRow}>
                <Text style={styles.cardTitle}>VAT registered</Text>
                <Switch
                  value={vatRegistered}
                  onValueChange={setVatRegistered}
                  trackColor={{ true: brand.colours.primary }}
                />
              </View>
              {vatRegistered && (
                <Field
                  label="VAT number"
                  value={vatNumber}
                  onChangeText={setVatNumber}
                  autoCapitalize="characters"
                />
              )}
            </>
          )}
        </>
      )}
      {mode !== "verify" && mode !== "reset" && (
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      )}
      {(mode === "signin" || mode === "create" || mode === "reset") && (
        <Field
          label={mode === "reset" ? "New password" : "Password"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      )}
      {mode === "create" && (
        <Text style={styles.legalNote}>
          By continuing, you agree to the applicable ValX terms and privacy
          notice. Passwords must contain at least 10 characters.
        </Text>
      )}
      {mode === "verification_sent" && (
        <Text style={styles.body}>
          We sent a secure verification link to {email}. Open it to activate
          the account. The link expires after one hour.
        </Text>
      )}
      {notice ? <Text style={styles.feedback}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {(mode === "signin" || mode === "create") && (
        <PrimaryButton
          label={
            busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Join beta"
          }
          onPress={submit}
          disabled={busy}
        />
      )}
      {(mode === "forgot" || mode === "reset" || mode === "verify") && (
        <PrimaryButton
          label={
            busy
              ? "Please wait..."
              : mode === "forgot"
                ? "Send reset link"
                : mode === "reset"
                  ? "Change password"
                  : "Verify email"
          }
          onPress={submit}
          disabled={
            busy ||
            ((mode === "verify" || mode === "reset") && !actionToken)
          }
        />
      )}
      {mode === "signin" && (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => setMode("forgot")}
        >
          <Text style={styles.secondaryText}>Forgot password?</Text>
        </Pressable>
      )}
      {mode === "verification_sent" && (
        <PrimaryButton
          label={busy ? "Please wait..." : "Resend verification email"}
          onPress={resendVerification}
          disabled={busy}
        />
      )}
      {mode !== "signin" && mode !== "create" && (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => setMode("signin")}
        >
          <Text style={styles.secondaryText}>Back to sign in</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function AccountPanel({
  user,
  onSignedOut
}: {
  user: User;
  onSignedOut: () => void;
}) {
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  const support = async () => {
    setBusy(true);
    try {
      await api("/v1/support/requests", {
        method: "POST",
        body: { category: "other", message }
      });
      setMessage("");
      setFeedback("Your support request has been recorded.");
    } catch (error) {
      setFeedback(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await api("/v1/auth/logout", { method: "POST" });
    } finally {
      await session.clear();
      onSignedOut();
    }
  };

  const requestDeletion = () =>
    Alert.alert(
      "Request account deletion?",
      "ValX will sign you out and review statutory or active-dispute record holds before deletion.",
      [
        { text: "Keep account", style: "cancel" },
        {
          text: "Request deletion",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await api("/v1/account/deletion-request", {
                method: "POST",
                body: { confirmation: "DELETE" }
              });
              await session.clear();
              onSignedOut();
            } catch (error) {
              setFeedback(messageFor(error));
              setBusy(false);
            }
          }
        }
      ]
    );

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>ACCOUNT</Text>
      <Text style={styles.sectionTitle}>{user.name}</Text>
      <Text style={styles.body}>{user.email}</Text>
      <View style={styles.policyCard}>
        <Text style={styles.cardTitle}>Privacy at ValX</Text>
        <Text style={styles.body}>
          We use account, vehicle, address and booking information to operate
          the service. Booking and finance records are retained for seven years
          where legally required. Support evidence is retained for 24 months
          after a case closes.
        </Text>
        <Text style={styles.body}>
          ValX is the service supplier. No payment provider is connected to this
          private beta.
        </Text>
      </View>
      <Field
        label="Contact support"
        value={message}
        onChangeText={setMessage}
        multiline
      />
      <PrimaryButton
        label={busy ? "Please wait…" : "Send support request"}
        onPress={support}
        disabled={busy || message.trim().length < 10}
      />
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      <Pressable style={styles.secondaryButton} onPress={signOut}>
        <Text style={styles.secondaryText}>Sign out</Text>
      </Pressable>
      <Pressable
        style={styles.dangerButton}
        onPress={requestDeletion}
        disabled={busy}
      >
        <Text style={styles.dangerText}>Request account deletion</Text>
      </Pressable>
    </View>
  );
}

function CustomerApp({
  user,
  onSignedOut
}: {
  user: User;
  onSignedOut: () => void;
}) {
  const [tab, setTab] = useState<"book" | "bookings" | "account">("book");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [registration, setRegistration] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("suv");
  const [addressLabel, setAddressLabel] = useState("");
  const [postcode, setPostcode] = useState("");
  const [waterAvailable, setWaterAvailable] = useState(true);
  const [serviceId, setServiceId] =
    useState<ServiceId>("exterior-interior");
  const [bookingType, setBookingType] =
    useState<"prebook" | "next_available">("prebook");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const refresh = useCallback(async () => {
    const [vehicleData, addressData, bookingData] = await Promise.all([
      api<{ vehicles: Vehicle[] }>("/v1/customer/vehicles"),
      api<{ addresses: Address[] }>("/v1/customer/addresses"),
      api<{ bookings: Booking[] }>("/v1/customer/bookings")
    ]);
    setVehicles(vehicleData.vehicles);
    setAddresses(addressData.addresses);
    setBookings(bookingData.bookings);
  }, []);

  useEffect(() => {
    refresh().catch((error) => setFeedback(messageFor(error)));
  }, [refresh]);

  const addVehicle = async () => {
    setBusy(true);
    try {
      await api("/v1/customer/vehicles", {
        method: "POST",
        body: {
          registrationNumber: registration,
          make,
          model,
          type: vehicleType,
          lookupSource: "manual"
        }
      });
      setFeedback("Vehicle saved.");
      await refresh();
    } catch (error) {
      setFeedback(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  const addAddress = async () => {
    setBusy(true);
    try {
      await api("/v1/customer/addresses", {
        method: "POST",
        body: {
          label: addressLabel,
          postcode,
          waterAvailable
        }
      });
      setFeedback("Service address saved.");
      await refresh();
    } catch (error) {
      setFeedback(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  const getQuote = async () => {
    if (!vehicles[0] || !addresses[0]) return;
    setBusy(true);
    try {
      const result = await api<{ quote: Quote }>("/v1/customer/quotes", {
        method: "POST",
        body: {
          serviceId,
          vehicleType: vehicles[0].type,
          distanceMiles: 1.8,
          fastTrack: bookingType === "next_available"
        }
      });
      setQuote({ ...result.quote, serviceId });
      setFeedback("");
    } catch (error) {
      setFeedback(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  const confirmBooking = async () => {
    if (!vehicles[0] || !addresses[0] || !quote) return;
    setBusy(true);
    try {
      const scheduledFor =
        bookingType === "prebook"
          ? new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString()
          : undefined;
      await api("/v1/customer/bookings", {
        method: "POST",
        body: {
          vehicleId: vehicles[0].id,
          addressId: addresses[0].id,
          quoteId: quote.id,
          bookingType,
          scheduledFor
        }
      });
      setQuote(null);
      setFeedback("Booking request confirmed. No payment has been taken.");
      await refresh();
      setTab("bookings");
    } catch (error) {
      setFeedback(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <BrandHeader detail={`Customer · ${user.name}`} />
      <Choice
        values={["book", "bookings", "account"] as const}
        value={tab}
        onChange={setTab}
        labels={{ book: "Book", bookings: "Bookings", account: "Account" }}
      />
      {tab === "book" && (
        <View style={styles.section}>
          {vehicles.length === 0 ? (
            <>
              <Text style={styles.eyebrow}>STEP 1</Text>
              <Text style={styles.sectionTitle}>Add your vehicle</Text>
              <Text style={styles.body}>
                DVLA lookup remains in mock mode. Confirm the body type because
                it affects price and duration.
              </Text>
              <Field
                label="Registration"
                value={registration}
                onChangeText={setRegistration}
                autoCapitalize="characters"
              />
              <Field label="Make" value={make} onChangeText={setMake} />
              <Field label="Model" value={model} onChangeText={setModel} />
              <Choice
                values={["hatchback", "sedan", "suv", "other"] as const}
                value={vehicleType}
                onChange={setVehicleType}
              />
              <PrimaryButton
                label="Save vehicle"
                onPress={addVehicle}
                disabled={busy || !registration.trim() || !make.trim()}
              />
            </>
          ) : addresses.length === 0 ? (
            <>
              <Text style={styles.eyebrow}>STEP 2</Text>
              <Text style={styles.sectionTitle}>Add a service address</Text>
              <Field
                label="Full address"
                value={addressLabel}
                onChangeText={setAddressLabel}
              />
              <Field
                label="Postcode"
                value={postcode}
                onChangeText={setPostcode}
                autoCapitalize="characters"
              />
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.cardTitle}>Outdoor water available</Text>
                  <Text style={styles.small}>
                    If not, only self-sufficient detailers can accept.
                  </Text>
                </View>
                <Switch
                  value={waterAvailable}
                  onValueChange={setWaterAvailable}
                  trackColor={{ true: brand.colours.primary }}
                />
              </View>
              <PrimaryButton
                label="Save address"
                onPress={addAddress}
                disabled={busy || addressLabel.length < 5 || postcode.length < 5}
              />
            </>
          ) : (
            <>
              <Text style={styles.eyebrow}>BOOK A DETAIL</Text>
              <Text style={styles.sectionTitle}>
                {vehicles[0].make} {vehicles[0].model}
              </Text>
              <Text style={styles.registration}>
                {vehicles[0].registrationNumber}
              </Text>
              {services.map((service) => (
                <Pressable
                  key={service.id}
                  onPress={() => {
                    setServiceId(service.id);
                    setQuote(null);
                  }}
                  style={[
                    styles.serviceCard,
                    serviceId === service.id && styles.selectedCard
                  ]}
                >
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{service.name}</Text>
                    <Text style={styles.small}>{service.note}</Text>
                  </View>
                  <Text style={styles.price}>
                    from {money.format(service.basePrice)}
                  </Text>
                </Pressable>
              ))}
              <Choice
                values={["prebook", "next_available"] as const}
                value={bookingType}
                onChange={(value) => {
                  setBookingType(value);
                  setQuote(null);
                }}
                labels={{
                  prebook: "Prebook",
                  next_available: "Next available"
                }}
              />
              {!quote ? (
                <PrimaryButton
                  label={busy ? "Calculating…" : "Lock quote"}
                  onPress={getQuote}
                  disabled={busy}
                />
              ) : (
                <View style={styles.quoteCard}>
                  <Text style={styles.eyebrow}>LOCKED FOR 15 MINUTES</Text>
                  <Text style={styles.quoteTotal}>
                    {money.format(quote.customerTotal)}
                  </Text>
                  <Text style={styles.body}>
                    Job {money.format(quote.jobPrice)} · Service fee{" "}
                    {money.format(quote.serviceFee)}
                  </Text>
                  <Text style={styles.paymentNotice}>
                    No payment will be taken in the private beta.
                  </Text>
                  <PrimaryButton
                    label={busy ? "Confirming…" : "Confirm booking request"}
                    onPress={confirmBooking}
                    disabled={busy}
                  />
                </View>
              )}
            </>
          )}
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        </View>
      )}
      {tab === "bookings" && (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>YOUR BOOKINGS</Text>
          <Text style={styles.sectionTitle}>History</Text>
          {bookings.length === 0 ? (
            <Text style={styles.body}>No booking requests yet.</Text>
          ) : (
            bookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <Text style={styles.cardTitle}>
                  {services.find(({ id }) => id === booking.serviceId)?.name}
                </Text>
                <Text style={styles.body}>
                  {booking.vehicle.make} {booking.vehicle.model} ·{" "}
                  {booking.address.postcode}
                </Text>
                <View style={styles.bookingFooter}>
                  <Text style={styles.status}>{booking.status.replace("_", " ")}</Text>
                  <Text style={styles.price}>
                    {money.format(booking.customerTotal)}
                  </Text>
                </View>
                <Text style={styles.paymentNotice}>
                  {booking.detailerName
                    ? `Detailer: ${booking.detailerName}`
                    : "Awaiting a detailer"}{" "}
                  · No payment taken
                </Text>
              </View>
            ))
          )}
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        </View>
      )}
      {tab === "account" && (
        <AccountPanel user={user} onSignedOut={onSignedOut} />
      )}
    </ScrollView>
  );
}

const nextStatus: Record<string, string> = {
  assigned: "on_way",
  on_way: "arrived",
  arrived: "in_progress",
  in_progress: "completed"
};

function DetailerApp({
  user,
  onSignedOut
}: {
  user: User;
  onSignedOut: () => void;
}) {
  const [tab, setTab] = useState<"offers" | "jobs" | "account">("offers");
  const [offers, setOffers] = useState<Booking[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [offerData, bookingData] = await Promise.all([
      api<{ offers: Booking[] }>("/v1/detailer/offers"),
      api<{ bookings: Booking[] }>("/v1/detailer/bookings")
    ]);
    setOffers(offerData.offers);
    setBookings(bookingData.bookings);
  }, []);

  useEffect(() => {
    refresh().catch((error) => setFeedback(messageFor(error)));
  }, [refresh]);

  const accept = async (id: string) => {
    setBusy(true);
    try {
      await api(`/v1/detailer/bookings/${id}/accept`, { method: "POST" });
      setFeedback("Job accepted at the displayed guaranteed pay.");
      await refresh();
      setTab("jobs");
    } catch (error) {
      setFeedback(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  const advance = async (booking: Booking) => {
    const status = nextStatus[booking.status];
    if (!status) return;
    setBusy(true);
    try {
      await api(`/v1/detailer/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: { status }
      });
      await refresh();
    } catch (error) {
      setFeedback(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  const renderBooking = (booking: Booking, isOffer: boolean) => (
    <View key={booking.id} style={styles.bookingCard}>
      <Text style={styles.eyebrow}>
        {isOffer ? "AVAILABLE JOB" : booking.status.replace("_", " ")}
      </Text>
      <Text style={styles.cardTitle}>
        {services.find(({ id }) => id === booking.serviceId)?.name}
      </Text>
      <Text style={styles.body}>
        {booking.vehicle.make} {booking.vehicle.model} ·{" "}
        {booking.address.postcode}
      </Text>
      <Text style={styles.earnings}>
        {money.format(booking.detailerEarnings)} guaranteed pay
      </Text>
      <Text style={styles.paymentNotice}>
        Full displayed pay; no fee is deducted at payout. Payments are not
        connected in this beta.
      </Text>
      {isOffer ? (
        <PrimaryButton
          label={busy ? "Please wait…" : "Accept job"}
          onPress={() => accept(booking.id)}
          disabled={busy}
        />
      ) : nextStatus[booking.status] ? (
        <PrimaryButton
          label={
            {
              on_way: "Start journey",
              arrived: "Confirm arrival",
              in_progress: "Start work",
              completed: "Complete job"
            }[nextStatus[booking.status]] ?? "Update job"
          }
          onPress={() => advance(booking)}
          disabled={busy}
        />
      ) : null}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <BrandHeader detail={`Detailer · ${user.name}`} />
      <Choice
        values={["offers", "jobs", "account"] as const}
        value={tab}
        onChange={setTab}
        labels={{ offers: "Offers", jobs: "My jobs", account: "Account" }}
      />
      {tab === "offers" && (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>JOBS NEAR YOU</Text>
          <Text style={styles.sectionTitle}>Available work</Text>
          {offers.length
            ? offers.map((booking) => renderBooking(booking, true))
            : <Text style={styles.body}>No eligible jobs are waiting.</Text>}
        </View>
      )}
      {tab === "jobs" && (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>YOUR SCHEDULE</Text>
          <Text style={styles.sectionTitle}>Accepted jobs</Text>
          {bookings.length
            ? bookings.map((booking) => renderBooking(booking, false))
            : <Text style={styles.body}>You have not accepted a job yet.</Text>}
        </View>
      )}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      {tab === "account" && (
        <AccountPanel user={user} onSignedOut={onSignedOut} />
      )}
    </ScrollView>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api<{ user: User }>("/v1/me")
      .then((result) => setUser(result.user))
      .catch(() => session.clear())
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator color={brand.colours.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      {user ? (
        user.role === "customer" ? (
          <CustomerApp user={user} onSignedOut={() => setUser(null)} />
        ) : (
          <DetailerApp user={user} onSignedOut={() => setUser(null)} />
        )
      ) : (
        <AuthScreen onAuthenticated={setUser} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.colours.background },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brand.colours.background
  },
  screen: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 56,
    gap: 14
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  mark: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: brand.colours.primary
  },
  markText: { color: "#2B1709", fontSize: 22, fontWeight: "900" },
  brand: { color: brand.colours.text, fontSize: 24, fontWeight: "900" },
  kicker: {
    marginTop: 3,
    color: brand.colours.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3
  },
  hero: {
    padding: 22,
    borderWidth: 1,
    borderColor: brand.colours.line,
    borderRadius: brand.radius.large,
    backgroundColor: brand.colours.panel,
    gap: 8
  },
  heroTitle: { color: brand.colours.text, fontSize: 27, fontWeight: "900" },
  eyebrow: {
    color: brand.colours.primary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3
  },
  body: { color: brand.colours.muted, fontSize: 13, lineHeight: 20 },
  small: { color: brand.colours.muted, fontSize: 11, lineHeight: 16 },
  choiceRow: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    borderRadius: 15,
    backgroundColor: brand.colours.panel
  },
  choice: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11
  },
  choiceActive: { backgroundColor: brand.colours.primary },
  choiceText: {
    color: brand.colours.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  choiceTextActive: { color: "#2B1709" },
  field: { gap: 6 },
  fieldLabel: {
    color: brand.colours.text,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: brand.colours.line,
    borderRadius: 14,
    backgroundColor: brand.colours.panel,
    color: brand.colours.text
  },
  multiline: { minHeight: 110, paddingTop: 15, textAlignVertical: "top" },
  primaryButton: {
    minHeight: 52,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: brand.colours.primary
  },
  primaryButtonText: { color: "#2B1709", fontWeight: "900" },
  disabled: { opacity: 0.45 },
  toggleRow: {
    minHeight: 64,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: brand.colours.line,
    borderRadius: 15,
    backgroundColor: brand.colours.panel
  },
  toggleCopy: { flex: 1, gap: 4 },
  cardTitle: { color: brand.colours.text, fontSize: 15, fontWeight: "900" },
  cardCopy: { flex: 1, gap: 4 },
  legalNote: {
    color: brand.colours.muted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center"
  },
  error: { color: "#FF9E9E", fontSize: 12, textAlign: "center" },
  feedback: {
    padding: 12,
    color: brand.colours.primary,
    fontSize: 12,
    textAlign: "center"
  },
  section: { gap: 14 },
  sectionTitle: { color: brand.colours.text, fontSize: 24, fontWeight: "900" },
  policyCard: {
    padding: 18,
    gap: 9,
    borderWidth: 1,
    borderColor: brand.colours.primary,
    borderRadius: 18,
    backgroundColor: "#211913"
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: brand.colours.line,
    borderRadius: 14
  },
  secondaryText: { color: brand.colours.text, fontWeight: "800" },
  dangerButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#6A3333",
    borderRadius: 14,
    backgroundColor: "#251919"
  },
  dangerText: { color: "#FFAAAA", fontWeight: "800" },
  registration: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: "#F4F4F1",
    color: "#111111",
    fontWeight: "900",
    letterSpacing: 1
  },
  serviceCard: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: brand.colours.line,
    borderRadius: 18,
    backgroundColor: brand.colours.panel
  },
  selectedCard: { borderColor: brand.colours.primary, backgroundColor: "#211913" },
  price: { color: brand.colours.primary, fontWeight: "900" },
  quoteCard: {
    padding: 20,
    gap: 10,
    borderRadius: 20,
    backgroundColor: brand.colours.text
  },
  quoteTotal: { color: "#111311", fontSize: 30, fontWeight: "900" },
  paymentNotice: { color: brand.colours.muted, fontSize: 10, lineHeight: 15 },
  bookingCard: {
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: brand.colours.line,
    borderRadius: 18,
    backgroundColor: brand.colours.panel
  },
  bookingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  status: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#2C241D",
    color: brand.colours.primary,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  earnings: { color: brand.colours.primary, fontSize: 19, fontWeight: "900" }
});
