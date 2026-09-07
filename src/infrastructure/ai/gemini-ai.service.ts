import { GoogleGenerativeAI } from "@google/generative-ai";
import { IAIService } from "../../core/interfaces/ai-service.interface";
import { parseGeminiError } from "./ai-error-handler";

export class GeminiAIService implements IAIService {
  private readonly client: GoogleGenerativeAI | null;
  private readonly apiKey: string;
  private readonly modelName: string;

  constructor(apiKey: string, modelName = "gemini-2.5-flash") {
    this.apiKey = (apiKey || "").trim();
    this.modelName = (modelName || "gemini-2.5-flash").trim();
    this.client = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  async generateContent(prompt: string): Promise<string> {
    if (!this.client || !this.apiKey) {
      throw new Error("No se ha configurado la API Key de Gemini. Por favor ingresa tu API Key en la barra superior para continuar.");
    }

    const model = this.client.getGenerativeModel({
      model: this.modelName,
    });

    const maxRetries = 1;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (err) {
        const parsed = parseGeminiError(err);
        if (parsed.isHighDemand && attempt < maxRetries) {
          // Breve pausa para superar el micro-pico de demanda temporal en los servidores de Google
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        const formattedMessage = parsed.isHighDemand
          ? `${parsed.userMessage} ${parsed.userRecommendation}`
          : parsed.userMessage;

        const error = new Error(formattedMessage);
        (error as unknown as Record<string, unknown>).formatted = parsed;
        throw error;
      }
    }

    throw new Error("No fue posible obtener respuesta del modelo tras reintentar.");
  }
}
