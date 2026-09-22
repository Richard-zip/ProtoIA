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

  async generateContent(prompt: string, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) {
      const abortError = new Error("Generación de protocolo detenida por el usuario.");
      abortError.name = "AbortError";
      throw abortError;
    }

    if (!this.client || !this.apiKey) {
      throw new Error("No se ha configurado la API Key de Gemini. Por favor ingresa tu API Key en la barra superior para continuar.");
    }

    const model = this.client.getGenerativeModel({
      model: this.modelName,
    });

    const maxRetries = 1;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) {
        const abortError = new Error("Generación de protocolo detenida por el usuario.");
        abortError.name = "AbortError";
        throw abortError;
      }

      try {
        const generatePromise = model.generateContent(prompt);
        let result;
        if (signal) {
          result = await Promise.race([
            generatePromise,
            new Promise<never>((_, reject) => {
              const onAbort = () => {
                const abortError = new Error("Generación de protocolo detenida por el usuario.");
                abortError.name = "AbortError";
                reject(abortError);
              };
              if (signal.aborted) {
                onAbort();
              } else {
                signal.addEventListener("abort", onAbort, { once: true });
              }
            }),
          ]);
        } else {
          result = await generatePromise;
        }

        const response = await result.response;
        return response.text();
      } catch (err) {
        if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
          const abortError = new Error("Generación de protocolo detenida por el usuario.");
          abortError.name = "AbortError";
          throw abortError;
        }

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

    throw new Error("Se han agotado temporalmente los intentos de generación. Por favor, inténtalo más tarde. Recuerda que Agnes AI puede cometer errores y es importante que revises el contenido generado.");
  }
}
