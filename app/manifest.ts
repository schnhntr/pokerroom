import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poker Room",
    short_name: "Poker Room",
    description: "Installable home poker settlement app for buy-ins, rebuys, and payout optimization.",
    start_url: "/",
    display: "standalone",
    background_color: "#09100d",
    theme_color: "#0f1714",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/maskable-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
