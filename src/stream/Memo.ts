import {
  nonNegativeInteger,
  type NonNegativeInteger,
} from '@fundamentry/number';

import { Stream } from './Stream.js';

export class Memo<out T> {
  readonly #source: Stream<T>;

  readonly #buffer: T[] = [];

  constructor(source: Iterable<T>) {
    this.#source = new Stream(source);
  }

  has(index: NonNegativeInteger): boolean {
    while (index >= this.#buffer.length) {
      if (this.#source.isAtEnd()) return false;

      this.#buffer.push(this.#source.next() as T);
    }

    return true;
  }

  reaches(offset: NonNegativeInteger): boolean {
    return (
      Number.isSafeInteger(offset) &&
      (offset === 0 || this.has(nonNegativeInteger(offset - 1)))
    );
  }

  get(index: NonNegativeInteger): T | undefined {
    return this.has(index) ? this.#buffer[index] : undefined;
  }

  slice(start: NonNegativeInteger, end: NonNegativeInteger): T[] {
    if (end > start) this.has(nonNegativeInteger(end - 1));

    return this.#buffer.slice(start, end);
  }
}
