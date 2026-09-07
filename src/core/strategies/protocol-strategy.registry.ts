import { IProtocolStrategy } from "../interfaces/protocol-strategy.interface";

export interface IProtocolRegistry {
  register(strategy: IProtocolStrategy): void;
  get(id: string): IProtocolStrategy;
  getAll(): IProtocolStrategy[];
  has(id: string): boolean;
}

export class ProtocolStrategyRegistry implements IProtocolRegistry {
  private readonly strategies = new Map<string, IProtocolStrategy>();

  constructor(initialStrategies: IProtocolStrategy[] = []) {
    initialStrategies.forEach((strategy) => this.register(strategy));
  }

  register(strategy: IProtocolStrategy): void {
    if (this.strategies.has(strategy.id)) {
      console.warn(`[ProtocolStrategyRegistry] Overwriting existing strategy for type '${strategy.id}'`);
    }
    this.strategies.set(strategy.id, strategy);
  }

  get(id: string): IProtocolStrategy {
    const strategy = this.strategies.get(id);
    if (!strategy) {
      const available = Array.from(this.strategies.keys()).join(", ");
      throw new Error(
        `Estrategia de protocolo desconocida: '${id}'. Estrategias registradas: [${available}]`
      );
    }
    return strategy;
  }

  getAll(): IProtocolStrategy[] {
    return Array.from(this.strategies.values());
  }

  has(id: string): boolean {
    return this.strategies.has(id);
  }
}
