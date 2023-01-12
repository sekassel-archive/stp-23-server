declare global {
  interface Array<T> {
    sum(): number;
    shuffle(): T[];
    maxBy(selector: (item: T) => number): T;
    countIf(predicate: (item: T) => boolean): number;
  }

  interface Math {
    randInt(maxExclusive: number): number;
  }
}

Array.prototype.sum = function() {
  return this.reduce((a, c) => a + c, 0);
};

Array.prototype.shuffle = function() {
  for (let i = this.length - 1; i > 0; i--) {
    const j = Math.randInt(i + 1);
    [this[i], this[j]] = [this[j], this[i]];
  }
  return this;
}

Array.prototype.maxBy = function(selector: (item: any) => number) {
  return this.reduce((a, c) => (selector(a) >= selector(c) ? a : c));
}

Array.prototype.countIf = function(predicate: (item: any) => boolean) {
  return this.reduce((a, c) => (predicate(c) ? a + 1 : a), 0);
}

Math.randInt = function(maxExclusive: number) {
  return Math.floor(Math.random() * maxExclusive);
}

export {};
