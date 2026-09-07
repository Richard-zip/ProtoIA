export interface FormattedAiError {
  isHighDemand: boolean;
  isQuotaExceeded: boolean;
  isAuthError: boolean;
  isNetworkError: boolean;
  userTitle: string;
  userMessage: string;
  userRecommendation: string;
  rawError?: string;
}

export function parseGeminiError(error: unknown): FormattedAiError {
  const raw = error instanceof Error ? error.message : String(error);

  // 1. Servidores de Google con alta demanda temporal (503 / Service Unavailable / High demand / Overloaded)
  if (
    raw.includes("503") ||
    /high demand/i.test(raw) ||
    /spikes in demand/i.test(raw) ||
    /overloaded/i.test(raw) ||
    /UNAVAILABLE/i.test(raw) ||
    /Service Unavailable/i.test(raw)
  ) {
    return {
      isHighDemand: true,
      isQuotaExceeded: false,
      isAuthError: false,
      isNetworkError: false,
      userTitle: "Servidores de Google en alta demanda temporal",
      userMessage:
        "Los servidores de Google Gemini están experimentando un alto volumen de solicitudes a nivel global en este momento. Este evento es completamente externo a la aplicación Agnes.",
      userRecommendation:
        "Los picos de demanda en Google suelen durar pocos segundos. Por favor, espera unos instantes y vuelve a intentar.",
      rawError: raw,
    };
  }

  // 2. Límite de cuota excedido (429 / RESOURCE_EXHAUSTED / Quota exceeded)
  if (
    raw.includes("429") ||
    /RESOURCE_EXHAUSTED/i.test(raw) ||
    /quota/i.test(raw) ||
    /rate limit/i.test(raw) ||
    /Resource has been exhausted/i.test(raw)
  ) {
    return {
      isHighDemand: false,
      isQuotaExceeded: true,
      isAuthError: false,
      isNetworkError: false,
      userTitle: "Límite de solicitudes de IA alcanzado",
      userMessage:
        "Se ha alcanzado temporalmente la cuota máxima de peticiones permitidas por la API de Google Gemini.",
      userRecommendation:
        "Espera aproximadamente 1 minuto antes de solicitar una nueva generación para que la cuota se restablezca.",
      rawError: raw,
    };
  }

  // 3. Error de credenciales o clave API (400 / 401 / 403 / API_KEY_INVALID)
  if (
    /API_KEY_INVALID/i.test(raw) ||
    /API key not valid/i.test(raw) ||
    /PERMISSION_DENIED/i.test(raw) ||
    raw.includes("401") ||
    raw.includes("403")
  ) {
    return {
      isHighDemand: false,
      isQuotaExceeded: false,
      isAuthError: true,
      isNetworkError: false,
      userTitle: "Clave de API de Gemini no válida",
      userMessage:
        "No fue posible autenticar la solicitud ante Google. La clave configurada es incorrecta o no tiene los permisos necesarios.",
      userRecommendation:
        "Verifica tu API Key desde el botón de Configuración en la barra superior y asegúrate de que sea válida.",
      rawError: raw,
    };
  }

  // 4. Problemas de conexión o red
  if (
    /fetch failed/i.test(raw) ||
    /ENOTFOUND/i.test(raw) ||
    /ECONNREFUSED/i.test(raw) ||
    /NetworkError/i.test(raw) ||
    /Failed to fetch/i.test(raw)
  ) {
    return {
      isHighDemand: false,
      isQuotaExceeded: false,
      isAuthError: false,
      isNetworkError: true,
      userTitle: "Sin conexión a los servidores de IA",
      userMessage:
        "No se pudo establecer comunicación con los servidores de Google Gemini.",
      userRecommendation:
        "Comprueba tu conexión a internet e inténtalo nuevamente.",
      rawError: raw,
    };
  }

  // 5. Filtros de seguridad del modelo
  if (/SAFETY/i.test(raw) || /blocked/i.test(raw) || /HARM_CATEGORY/i.test(raw)) {
    return {
      isHighDemand: false,
      isQuotaExceeded: false,
      isAuthError: false,
      isNetworkError: false,
      userTitle: "Contenido no procesable por políticas de IA",
      userMessage:
        "La respuesta fue bloqueada por los filtros automáticos de seguridad de Google Gemini.",
      userRecommendation:
        "Prueba ajustando o reformulando los temas ingresados para la materia.",
      rawError: raw,
    };
  }

  // 6. Mensaje genérico limpio sin URLs de endpoints
  const cleanMsg = raw
    .replace(/https?:\/\/generativelanguage\.googleapis\.com[^\s:]*:?\s*/gi, "")
    .trim();

  return {
    isHighDemand: false,
    isQuotaExceeded: false,
    isAuthError: false,
    isNetworkError: false,
    userTitle: "Inconveniente al generar el protocolo",
    userMessage:
      cleanMsg || "Ocurrió un error inesperado durante la comunicación con el servicio de IA.",
    userRecommendation: "Verifica los datos ingresados e intenta de nuevo en unos instantes.",
    rawError: raw,
  };
}
