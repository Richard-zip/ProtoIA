export interface AppConfig {
  geminiApiKey: string;
  geminiModel: string;
  appName: string;
}

export const appConfig: AppConfig = {
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || "",
  geminiModel: import.meta.env.GEMINI_MODEL || "gemini-2.5-flash",
  appName: import.meta.env.VITE_APP_NAME || import.meta.env.APP_NAME || "Agnes",
};
