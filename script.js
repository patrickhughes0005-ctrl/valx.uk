"use strict";

const roles = {
  customer: {
    label: "Customer",
    eyebrow: "BOOK A DETAIL",
    title: "Range Rover Evoque",
    detail: "RE22 CEX · SUV · customer-selected address",
    value: "£84.49",
    valueLabel: "locked total",
    action: "Review booking",
    chips: ["Exterior + Interior", "Tomorrow · 10:30", "Water available"]
  },
  detailer: {
    label: "Detailer",
    eyebrow: "AVAILABLE JOB",
    title: "Exterior + Interior",
    detail: "Range Rover Evoque · 1.8 miles",
    value: "£64.40",
    valueLabel: "guaranteed pay",
    action: "Accept job",
    chips: ["90–105 minutes", "Customer water", "Tomorrow · 10:30"]
  },
  admin: {
    label: "Admin",
    eyebrow: "CONTROLLED OPERATIONS",
    title: "Private operations",
    detail: "Identity, jobs, trust and finance",
    value: "15 min",
    valueLabel: "idle timeout",
    action: "View controls",
    chips: ["MFA required", "Role-based access", "Append-only audit"]
  }
};

const journeys = {
  customer: [
    ["01", "Join", "Invite-only account creation and secure sign-in."],
    ["02", "Configure", "Vehicle, address, water and service selection."],
    ["03", "Book", "Locked price and a clear no-payment beta request."],
    ["04", "Track", "Assigned detailer and job status through completion."]
  ],
  detailer: [
    ["01", "Onboard", "Service radius, water capability and VAT status."],
    ["02", "Assess", "See job, location, duration and full pay upfront."],
    ["03", "Deliver", "Accept, travel, arrive, work and complete."],
    ["04", "Build", "Activity, evidence and future earnings history."]
  ],
  admin: [
    ["01", "Approve", "Control who can operate on the marketplace."],
    ["02", "Observe", "Monitor bookings, quality and support cases."],
    ["03", "Govern", "Version policies and preserve audit history."],
    ["04", "Reconcile", "Separate customer sales and subcontractor costs."]
  ]
};

let currentRole = "customer";
let selectedStep = 0;

const byId = (id) => document.getElementById(id);

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderPhone() {
  const active = roles[currentRole];
  byId("phone-eyebrow").textContent = active.eyebrow;
  byId("phone-title").textContent = active.title;
  byId("phone-detail").textContent = active.detail;
  byId("phone-value").textContent = active.value;
  byId("phone-value-label").textContent = active.valueLabel;
  byId("phone-action").textContent = active.action;

  const visual = byId("phone-visual");
  visual.replaceChildren();
  if (currentRole === "customer") {
    const image = document.createElement("img");
    image.src = "assets/vehicles/suv.png";
    image.alt = "Black SUV product visual";
    image.width = 768;
    image.height = 512;
    visual.append(image);
  } else {
    visual.append(
      makeElement(
        "div",
        `role-glyph ${currentRole}`,
        currentRole === "detailer" ? "DX" : "AX"
      )
    );
  }

  const chips = byId("phone-chips");
  chips.replaceChildren(
    ...active.chips.map((chip) => makeElement("span", "", chip))
  );
}

function renderJourney() {
  const entries = journeys[currentRole];
  const list = byId("journey-list");
  list.replaceChildren();

  entries.forEach(([number, title, detail], index) => {
    const button = makeElement(
      "button",
      selectedStep === index ? "active" : ""
    );
    button.type = "button";
    button.dataset.step = String(index);
    button.setAttribute("aria-pressed", String(selectedStep === index));

    const copy = makeElement("div");
    copy.append(
      makeElement("strong", "", title),
      makeElement("p", "", detail)
    );
    button.append(
      makeElement("span", "", number),
      copy,
      makeElement("i", "", "↗")
    );
    list.append(button);
  });

  const selected = entries[selectedStep];
  byId("journey-eyebrow").textContent = roles[currentRole].eyebrow;
  byId("journey-title").textContent = selected[1];
  byId("journey-detail").textContent = selected[2];
  byId("journey-status").textContent =
    currentRole === "admin" ? "Controlled access" : "Persisted securely";

  const symbol = byId("journey-symbol");
  symbol.className = `preview-symbol ${currentRole}`;
  symbol.replaceChildren();
  if (currentRole === "customer") {
    const image = document.createElement("img");
    image.src = "assets/vehicles/suv-silhouette.png";
    image.alt = "";
    image.width = 768;
    image.height = 512;
    symbol.append(image);
  } else {
    symbol.textContent = currentRole === "detailer" ? "DX" : "AX";
  }
}

function renderRoleButtons() {
  document.querySelectorAll("[data-role]").forEach((button) => {
    const active = button.dataset.role === currentRole;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function selectRole(role) {
  if (!roles[role]) return;
  currentRole = role;
  selectedStep = 0;
  renderRoleButtons();
  renderPhone();
  renderJourney();
}

document.addEventListener("click", (event) => {
  const roleButton = event.target.closest("[data-role]");
  if (roleButton) {
    selectRole(roleButton.dataset.role);
    return;
  }

  const stepButton = event.target.closest("[data-step]");
  if (stepButton) {
    selectedStep = Number(stepButton.dataset.step);
    renderJourney();
    return;
  }

  const jumpButton = event.target.closest("[data-jump-role]");
  if (jumpButton) {
    selectRole(jumpButton.dataset.jumpRole);
    byId("walkthrough").scrollIntoView({ behavior: "smooth" });
  }
});

byId("year").textContent = String(new Date().getFullYear());
selectRole("customer");
