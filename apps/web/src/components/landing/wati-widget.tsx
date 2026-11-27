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
          deployId: "93346e9b-c96b-43f5-9e23-219d7d01db8a",
        })
      }
    />
  );
}
