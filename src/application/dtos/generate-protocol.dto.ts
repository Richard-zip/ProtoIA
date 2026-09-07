export interface GenerateProtocolDto {
  materia: string;
  temas: string[];
  participantes: string[];
  tipo: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateGenerateProtocolInput(
  dto: GenerateProtocolDto,
  requiresParticipants: boolean
): ValidationResult {
  const errors: string[] = [];

  if (!dto.materia || !dto.materia.trim()) {
    errors.push("Falta ingresar la materia.");
  }

  const validTemas = (dto.temas || []).map((t) => t.trim()).filter(Boolean);
  if (validTemas.length === 0) {
    errors.push("Falta ingresar al menos un tema.");
  }

  if (requiresParticipants) {
    const validParticipantes = (dto.participantes || []).map((p) => p.trim()).filter(Boolean);
    if (validParticipantes.length === 0) {
      errors.push("Falta ingresar al menos un participante.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
