import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdminDashboard from "./AdminDashboard";
import "./admin.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminDashboard
      signedInEmail="demo@valx.uk"
      signOutHref="/demos/"
    />
  </StrictMode>
);
