import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import InstallsApp from "./pages/InstallsApp.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <InstallsApp />
  </StrictMode>,
);
