import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CustomerDetailerApp from "./CustomerDetailerApp";
import "./customer.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomerDetailerApp initialRole="customer" />
  </StrictMode>
);
