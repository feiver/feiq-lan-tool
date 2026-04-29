import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const view =
  new URLSearchParams(window.location.search).get("view") === "settings"
    ? "settings"
    : "main";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App view={view} />
  </React.StrictMode>,
);
