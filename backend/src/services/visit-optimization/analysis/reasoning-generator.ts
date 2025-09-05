// Reasoning Generator
export interface ReasoningGenerator {
  generateReasoning(data: any): string;
}

export class DefaultReasoningGenerator implements ReasoningGenerator {
  generateReasoning(data: any): string {
    // Default implementation
    return 'Default reasoning';
  }
}