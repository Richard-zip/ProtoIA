export interface ProtocolSection {
  title: string;
  body: string[];
}

export interface ProtocolInput {
  materia: string;
  temas: string[];
  participantes: string[];
  tipo: string;
}

export interface ProtocolMetadata {
  materia: string;
  temas: string[];
  participantes: string[];
  tipo: string;
  createdAt: Date;
}

export class Protocol {
  constructor(
    public readonly metadata: ProtocolMetadata,
    public readonly rawText: string,
    public readonly sections: ProtocolSection[],
    public readonly extractedFields: Record<string, string>
  ) {}

  get formattedTitle(): string {
    const materiaName = (this.metadata.materia || "Materia").trim();
    const typeLabel = this.metadata.tipo === "individual" ? "individual" : "colaborativo";
    return `Protocolo ${typeLabel} de ${materiaName}`;
  }

  get safeFileName(): string {
    const baseName = this.formattedTitle.toLowerCase();
    // Sanitize characters invalid in filenames
    const sanitized = baseName.replace(/[/\\:?"<>|]/g, "-").trim();
    return `${sanitized}.docx`;
  }

  get safePdfFileName(): string {
    return this.safeFileName.replace(/\.docx$/i, ".pdf");
  }
}
