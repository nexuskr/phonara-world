import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.c7a12cd613f64ce6bf31cc578b215a4b",
  appName: "ApexForge",
  webDir: "dist",
  server: {
    url: "https://c7a12cd6-13f6-4ce6-bf31-cc578b215a4b.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  ios: { contentInset: "always" },
  android: { allowMixedContent: true, captureInput: true },
  plugins: {
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    SplashScreen: { launchShowDuration: 600, backgroundColor: "#0a0a0f", showSpinner: false },
  },
};

export default config;
