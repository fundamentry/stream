import { nonNegative, type NonNegative } from '@fundamentry/number';

import { type Seekable } from '#project/type';

import { Cursor } from './Cursor.js';
import { Stream } from './Stream.js';

export class Tape<T> extends Cursor<T> implements Seekable {
  readonly #source: Stream<T>;

  readonly #buffer: T[] = [];

  #position: NonNegative;

  constructor(source: Iterable<T>) {
    super();

    this.#source = new Stream(source);
    this.#position = nonNegative(0);
  }

  override peek(): T | undefined {
    if (this.#position === this.#buffer.length) {
      const value = this.#source.next();

      if (value !== undefined) this.#buffer.push(value);
    }

    return this.#buffer[this.#position];
  }

  override next(): T | undefined {
    const value = this.peek();

    if (this.#position < this.#buffer.length)
      this.#position = nonNegative(this.#position + 1);

    return value;
  }

  tell(): NonNegative {
    return this.#position;
  }

  seek(position: NonNegative): void {
    const origin = this.#position;

    this.#position = nonNegative(Math.min(position, this.#buffer.length));

    while (this.#position < position)
      if (this.next() === undefined) {
        this.#position = origin;

        throw new RangeError(`Invalid seek position: '${String(position)}'`);
      }
  }
}
