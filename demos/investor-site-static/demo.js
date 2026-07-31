"use strict";

const app = document.body.dataset.app;

function money(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(value);
}

function initCustomer() {
  const screens = [...document.querySelectorAll("[data-customer-screen]")];
  const progress = [...document.querySelectorAll(".app-progress span")];
  const services = {
    exterior: { name: "Exterior Detail", base: 40 },
    complete: { name: "Exterior + Interior", base: 70 },
    deep: { name: "Deep Detail", base: 120 },
    premium: { name: "Premium Full Detail", base: 175 }
  };
  let step = 0;
  let serviceId = "complete";
  let bookingType = "prebook";

  function quote() {
    const service = services[serviceId];
    const fastTrack = bookingType === "next" ? 2 : 0;
    const jobPrice =
      Math.round((service.base * 1.15 + fastTrack) * 100) / 100;
    const total = Math.round((jobPrice + 3.99) * 100) / 100;

    document.getElementById("customer-total").textContent = money(total);
    document.getElementById("quote-total-row").textContent = money(total);
    document.getElementById("job-price").textContent = money(jobPrice);
    document.getElementById("quote-service").textContent =
      `${service.name} · SUV`;
    document.getElementById("quote-time").textContent =
      bookingType === "next" ? "Next eligible detailer" : "Tomorrow · 10:30";
  }

  function render() {
    screens.forEach((screen) => {
      screen.classList.toggle(
        "active",
        Number(screen.dataset.customerScreen) === step
      );
    });
    progress.forEach((item, index) => {
      item.classList.toggle("active", index <= step);
    });
    if (step === 3) quote();
  }

  document.addEventListener("click", (event) => {
    const next = event.target.closest("[data-customer-next]");
    const back = event.target.closest("[data-customer-back]");
    const reset = event.target.closest("[data-customer-reset]");
    const service = event.target.closest("[data-service]");
    const booking = event.target.closest("[data-booking-type]");
    const water = event.target.closest("#water-toggle");

    if (next) {
      step = Math.min(4, step + 1);
      render();
    } else if (back) {
      step = Math.max(0, step - 1);
      render();
    } else if (reset) {
      step = 0;
      serviceId = "complete";
      bookingType = "prebook";
      document
        .querySelectorAll("[data-service]")
        .forEach((item) =>
          item.classList.toggle("active", item.dataset.service === serviceId)
        );
      document
        .querySelectorAll("[data-booking-type]")
        .forEach((item) =>
          item.classList.toggle(
            "active",
            item.dataset.bookingType === bookingType
          )
        );
      render();
    } else if (service) {
      serviceId = service.dataset.service;
      document
        .querySelectorAll("[data-service]")
        .forEach((item) => item.classList.toggle("active", item === service));
    } else if (booking) {
      bookingType = booking.dataset.bookingType;
      document
        .querySelectorAll("[data-booking-type]")
        .forEach((item) => item.classList.toggle("active", item === booking));
    } else if (water) {
      water.classList.toggle("on");
      water.setAttribute(
        "aria-pressed",
        String(water.classList.contains("on"))
      );
    }
  });

  render();
}

function initDetailer() {
  let selectedOffer = "evoque";
  let stage = 0;
  const stageCopy = [
    ["ASSIGNED", "Job accepted", "The customer has been notified and the agreed pay is protected.", "Start journey →"],
    ["ON THE WAY", "Navigation started", "The customer can now see an approximate arrival status.", "Confirm arrival →"],
    ["ARRIVED", "Vehicle access confirmed", "Record before photographs and any existing blemishes.", "Start work →"],
    ["IN PROGRESS", "Detail underway", "The service timer and job evidence remain linked.", "Complete job →"],
    ["COMPLETED", "Job completed", "After photographs and the completion record have been saved.", "Run detailer demo again"]
  ];

  function selectOffer(id) {
    selectedOffer = id;
    document
      .querySelectorAll("[data-offer]")
      .forEach((item) =>
        item.classList.toggle("active", item.dataset.offer === id)
      );
    document
      .querySelectorAll("[data-offer-detail]")
      .forEach((item) =>
        item.classList.toggle("active", item.dataset.offerDetail === id)
      );
  }

  function renderStage() {
    const copy = stageCopy[stage];
    document.getElementById("detailer-stage-label").textContent = copy[0];
    document.getElementById("detailer-stage-title").textContent = copy[1];
    document.getElementById("detailer-stage-copy").textContent = copy[2];
    document.getElementById("advance-job").textContent = copy[3];
    document.querySelectorAll("[data-job-stage]").forEach((item) => {
      item.classList.toggle(
        "done",
        Number(item.dataset.jobStage) <= stage
      );
    });
  }

  document.addEventListener("click", (event) => {
    const offer = event.target.closest("[data-offer]");
    const accept = event.target.closest("#accept-job");
    const advance = event.target.closest("#advance-job");

    if (offer) {
      selectOffer(offer.dataset.offer);
    } else if (accept) {
      document.getElementById("detailer-offers").style.display = "none";
      document.getElementById("active-job").classList.add("active");
      document.getElementById("offer-actions").style.display = "none";
      stage = 0;
      renderStage();
    } else if (advance) {
      if (stage < stageCopy.length - 1) {
        stage += 1;
        renderStage();
      } else {
        stage = 0;
        document.getElementById("detailer-offers").style.display = "";
        document.getElementById("active-job").classList.remove("active");
        document.getElementById("offer-actions").style.display = "";
        selectOffer(selectedOffer);
      }
    }
  });

  selectOffer(selectedOffer);
}

function initAdmin() {
  const titles = {
    overview: "Marketplace overview",
    bookings: "Booking operations",
    detailers: "Detailer onboarding",
    policies: "Approved policies",
    audit: "Append-only audit log"
  };
  const bookingData = {
    "VX-2048": ["£84.49", "£64.40", "£16.10", "£3.99"],
    "VX-2047": ["£43.99", "£32.00", "£8.00", "£3.99"],
    "VX-2046": ["£216.41", "£169.94", "£42.48", "£3.99"],
    "VX-2045": ["£129.99", "£100.80", "£25.20", "£3.99"]
  };

  function selectView(id) {
    document.querySelectorAll("[data-admin-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.adminView === id);
    });
    document.querySelectorAll("[data-admin-section]").forEach((section) => {
      section.classList.toggle(
        "active",
        section.dataset.adminSection === id
      );
    });
    document.getElementById("admin-title").textContent = titles[id];
  }

  document.addEventListener("click", (event) => {
    const view = event.target.closest("[data-admin-view]");
    const inspect = event.target.closest("[data-inspect-booking]");
    const approve = event.target.closest(".approve");

    if (view) {
      selectView(view.dataset.adminView);
    } else if (inspect) {
      const id = inspect.dataset.inspectBooking;
      const inspector = document.getElementById("booking-inspector");
      const values = bookingData[id];
      inspector.querySelector("h2").textContent = `Booking ${id}`;
      inspector
        .querySelectorAll(".fact strong")
        .forEach((item, index) => {
          item.textContent = values[index];
        });
      inspector.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (approve) {
      const approved = approve.classList.toggle("approved");
      approve.textContent = approved ? "Approved ✓" : "Approve detailer";
    }
  });

  selectView("overview");
}

if (app === "customer") initCustomer();
if (app === "detailer") initDetailer();
if (app === "admin") initAdmin();
