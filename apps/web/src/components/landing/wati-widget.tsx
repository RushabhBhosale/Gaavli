"use client";

import Script from "next/script";

declare global {
  interface Window {
    Wati?: { initWidget: (options: Record<string, string>) => void };
  }
}

/** WATI WhatsApp growth widget (floating chat button) for public pages. */
export function WatiWidget() {
  return (
    <Script
      src="https://widget.wati.io/growth-widget.js"
      strategy="afterInteractive"
      onReady={() =>
        window.Wati?.initWidget({
          publicId: "gw_gj6lzs",
          apiHost: "https://widget-api.wati.io",
          deploySource: "manual",
          deployId: "1eccfa0f-e1e8-45f0-892c-ed606ebe4821",
        })
      }
    />
  );
}
