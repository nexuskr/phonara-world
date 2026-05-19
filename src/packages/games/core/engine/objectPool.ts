/**
 * Tiny generic object pool. Used by PayoutBurst, SpinReel symbols, RNG beads.
 * Allocation-free hot path; no GC stutter under heavy particle load.
 */
export interface Poolable {
  reset(): void;
}

export class ObjectPool<T extends Poolable> {
  private free: T[] = [];
  private inUse = 0;
  constructor(
    private factory: () => T,
    initial = 0,
    private max = 4096,
  ) {
    for (let i = 0; i < initial; i++) this.free.push(this.factory());
  }
  acquire(): T {
    const obj = this.free.pop() ?? this.factory();
    this.inUse++;
    return obj;
  }
  release(obj: T) {
    obj.reset();
    this.inUse--;
    if (this.free.length < this.max) this.free.push(obj);
  }
  get stats() {
    return { free: this.free.length, inUse: this.inUse };
  }
}
