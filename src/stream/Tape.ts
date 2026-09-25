import { nonNegative, type NonNegative } from '@fundamentry/number';

import { type Seekable } from '#project/type';

import { Cursor } from './Cursor.js';
import { Point } from './Point.js';

export class Tape<out T> extends Cursor<T> implements Seekable {
  readonly #origin: Point<T>;

  #point: Point<T>;

  constructor(source: Iterable<T>) {
    super();

    this.#origin = Point.of(source);
    this.#point = this.#origin;
  }

  override peek(): T | undefined {
    return this.#point.peek();
  }

  override next(): T | undefined {
    const step = this.#point.step();

    if (step === undefined) return undefined;

    this.#point = step.rest;

    return step.value;
  }

  override isAtEnd(): boolean {
    return this.#point.isAtEnd();
  }

  tell(): NonNegative {
    return nonNegative(this.#point.distanceFrom(this.#origin));
  }

  seek(target: NonNegative | Point<unknown>): void {
    try {
      this.#point = this.#point.at(target);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;

      throw new RangeError(
        target instanceof Point
          ? 'Invalid seek position: point is from a different source'
          : `Invalid seek position: '${String(target)}'`
      );
    }
  }

  point(): Point<T> {
    return this.#point;
  }
}
