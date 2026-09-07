export interface ProtocolStrategyInput {
  materia: string;
  temas: string[];
  participantes: string[];
}

export interface TemplateTarget {
  heading: string | string[];
  content: string;
}

export interface IProtocolStrategy {
  readonly id: string;
  readonly label: string;
  readonly requiresParticipants: boolean;
  readonly defaultParticipantsText: string;
  readonly templatePath: string;

  buildPrompt(input: ProtocolStrategyInput): string;
  extractSections(rawText: string, input: ProtocolStrategyInput): Record<string, string>;
  getTemplateTargets(extracted: Record<string, string>): TemplateTarget[];
}
