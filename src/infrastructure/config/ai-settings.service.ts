import { GoogleGenerativeAI } from "@google/generative-ai";
import { appConfig } from "./env.config";
import { parseGeminiError } from "../ai/ai-error-handler";

export interface AISettings {
  apiKey: string;
  model: string;
}

export interface AIModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

export const AVAILABLE_MODELS: AIModelOption[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Modelo insignia de alta velocidad y calidad superior para síntesis académica.",
    badge: "Recomendado",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Máximo razonamiento deductivo para temas técnicos complejos.",
    badge: "Avanzado",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "Velocidad constante y alta estabilidad ante demandas elevadas.",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "Alta profundidad y contextualización histórica de contenidos.",
  },
];

const STORAGE_KEY_API_KEY = "agnes_gemini_api_key";
const STORAGE_KEY_MODEL = "agnes_gemini_model";

export class AISettingsService {
  static getSettings(): AISettings {
    let storedKey = "";
    let storedModel = "";

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        storedKey = window.localStorage.getItem(STORAGE_KEY_API_KEY) || "";
        storedModel = window.localStorage.getItem(STORAGE_KEY_MODEL) || "";
      }
    } catch (e) {
      console.warn("No se pudo acceder a localStorage:", e);
    }

    const apiKey = storedKey.trim() || appConfig.geminiApiKey || "";
    const model = storedModel.trim() || appConfig.geminiModel || "gemini-2.5-flash";

    return { apiKey, model };
  }

  static saveSettings(settings: AISettings): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_API_KEY, settings.apiKey.trim());
        window.localStorage.setItem(
          STORAGE_KEY_MODEL,
          settings.model.trim() || "gemini-2.5-flash"
        );
      }
    } catch (e) {
      console.error("Error al guardar la configuración en localStorage:", e);
    }
  }

  static hasValidApiKey(): boolean {
    const { apiKey } = this.getSettings();
    return Boolean(apiKey && apiKey.trim().length > 0);
  }

  static clearSettings(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY_API_KEY);
        window.localStorage.removeItem(STORAGE_KEY_MODEL);
      }
    } catch (e) {
      console.warn("No se pudo limpiar localStorage:", e);
    }
  }
}

export async function testGeminiConnection(
  apiKey: string,
  modelName: string
): Promise<{ success: boolean; message: string }> {
  const cleanKey = apiKey.trim();
  const cleanModel = modelName.trim() || "gemini-2.5-flash";

  if (!cleanKey) {
    return {
      success: false,
      message: "La API Key no puede estar vacía.",
    };
  }

  try {
    const client = new GoogleGenerativeAI(cleanKey);
    const model = client.getGenerativeModel({ model: cleanModel });
    const result = await model.generateContent("Responde únicamente la palabra OK.");
    const response = await result.response;
    const text = response.text();

    if (text) {
      return {
        success: true,
        message: `¡Conexión exitosa! El modelo "${cleanModel}" respondió correctamente.`,
      };
    }
    return {
      success: false,
      message: "El modelo respondió pero no devolvió contenido.",
    };
  } catch (err) {
    const parsed = parseGeminiError(err);
    const detail = parsed.isHighDemand
      ? `${parsed.userMessage} ${parsed.userRecommendation}`
      : parsed.userMessage;
    return {
      success: false,
      message: detail || "No fue posible verificar la API Key.",
    };
  }
}
