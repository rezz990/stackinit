export interface RegisteredAdapter {
  readonly id: string;
}

export class DuplicateAdapterError extends Error {
  constructor(readonly adapterId: string) {
    super(`Adapter "${adapterId}" is already registered.`);
    this.name = "DuplicateAdapterError";
  }
}

export class UnsupportedAdapterError extends Error {
  constructor(readonly adapterId: string) {
    super(`Adapter "${adapterId}" is not supported.`);
    this.name = "UnsupportedAdapterError";
  }
}

export class AdapterRegistry<Adapter extends RegisteredAdapter> {
  readonly #adapters = new Map<string, Adapter>();

  constructor(adapters: readonly Adapter[] = []) {
    for (const adapter of adapters) this.register(adapter);
  }

  register(adapter: Adapter): void {
    if (this.#adapters.has(adapter.id)) {
      throw new DuplicateAdapterError(adapter.id);
    }
    this.#adapters.set(adapter.id, adapter);
  }

  get(id: string): Adapter {
    const adapter = this.#adapters.get(id);
    if (!adapter) throw new UnsupportedAdapterError(id);
    return adapter;
  }
}
