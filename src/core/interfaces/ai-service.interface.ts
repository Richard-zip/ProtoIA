export interface IAIService {
  /**
   * Generates text content given a structured prompt.
   * @param prompt The complete prompt to send to the AI model.
   * @returns Generated text response.
   */
  generateContent(prompt: string): Promise<string>;
}
