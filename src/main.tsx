import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Initialize MSW
async function enableMocking() {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  try {
    const { worker } = await import("./mocks/browser");

    // Check if service worker is supported
    if (!("serviceWorker" in navigator)) {
      console.warn("⚠️ Service Worker not supported in this browser");
      return;
    }

    await worker.start({
      onUnhandledRequest: "warn",
      serviceWorker: {
        url: "/mockServiceWorker.js",
        options: {
          scope: "/"
        }
      }
    });
    console.log("🔧 MSW worker started successfully");

    // List registered handlers for debugging
    const handlers = worker.listHandlers();
    console.log(`📝 Registered ${handlers.length} handlers:`);
    handlers.forEach((handler) => {
      console.log("  -", handler.info.header);
    });

    // MSW is ready for API calls
  } catch (error) {
    console.error("❌ Failed to start MSW worker:", error);
    throw error;
  }
}

// Start the app only after MSW is ready
enableMocking()
  .then(() => {
    console.log("🚀 Starting React app...");
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  })
  .catch((error) => {
    console.error("❌ Failed to initialize app:", error);
    // Start app anyway for development
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
