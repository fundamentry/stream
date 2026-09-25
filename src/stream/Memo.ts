import { nonNegative, type NonNegative } from '@fundamentry/number';

import { Stream } from './Stream.js';

export class Memo<out T> {
  readonly #source: Stream<T>;

  readonly #buffer: T[] = [];

  constructor(source: Iterable<T>) {
    this.#source = new Stream(source);
  }

  has(index: NonNegative): boolean {
    while (index >= this.#buffer.length) {
      if (this.#source.isAtEnd()) return false;

      this.#buffer.push(this.#source.next() as T);
    }

    return true;
  }

  reaches(offset: NonNegative): boolean {
    return (
      Number.isSafeInteger(offset) &&
      (offset === 0 || this.has(nonNegative(offset - 1)))
    );
  }

  get(index: NonNegative): T | undefined {
    return this.has(index) ? this.#buffer[index] : undefined;
  }

  slice(start: NonNegative, end: NonNegative): T[] {
    if (end > start) this.has(nonNegative(end - 1));

    return this.#buffer.slice(start, end);
  }
}
