import { nonNegative, type NonNegative } from '@fundamentry/number';
import { type Comparable } from '@fundamentry/trait';

import { Memo } from './Memo.js';

export namespace Point {
  export interface Step<out T, out S extends T = T> {
    readonly value: S;
    readonly rest: Point<T>;
  }

  export interface Span<out T, out S extends T = T> {
    readonly values: S[];
    readonly rest: Point<T>;
  }
}

export class Point<out T> implements Comparable<Point<unknown>> {
  readonly #memo: Memo<T>;

  readonly #offset: NonNegative;

  private constructor(memo: Memo<T>, offset: NonNegative) {
    this.#memo = memo;
    this.#offset = offset;
  }

  static of<T>(source: Iterable<T>): Point<T> {
    return new Point(new Memo(source), nonNegative(0));
  }

  peek(): T | undefined {
    return this.#memo.get(this.#offset);
  }

  isAtEnd(): boolean {
    return !this.#memo.has(this.#offset);
  }

  step(): Point.Step<T> | undefined {
    if (this.isAtEnd()) return undefined;

    return {
      value: this.peek() as T,
      rest: new Point(this.#memo, nonNegative(this.#offset + 1)),
    };
  }

  stepIf<S extends T>(
    predicate: (value: T) => value is S
  ): Point.Step<T, S> | undefined;

  stepIf(predicate: (value: T) => boolean): Point.Step<T> | undefined;

  stepIf(predicate: (value: T) => boolean): Point.Step<T> | undefined {
    const step = this.step();

    return step !== undefined && predicate(step.value) ? step : undefined;
  }

  span<S extends T>(predicate: (value: T) => value is S): Point.Span<T, S>;

  span(predicate: (value: T) => boolean): Point.Span<T>;

  span(predicate: (value: T) => boolean): Point.Span<T> {
    let end = this.#offset;

    while (this.#memo.has(end) && predicate(this.#memo.get(end) as T))
      end = nonNegative(end + 1);

    return {
      values: this.#memo.slice(this.#offset, end),
      rest: new Point(this.#memo, end),
    };
  }

  at(target: NonNegative | Point<unknown>): Point<T> {
    if (target instanceof Point) {
      if (!this.hasSameSource(target))
        throw new RangeError('Point is from a different source');

      return target as Point<T>;
    }

    if (!this.#memo.reaches(target))
      throw new RangeError(`Invalid offset: '${String(target)}'`);

    return new Point(this.#memo, target);
  }

  hasSameSource(other: Point<unknown>): boolean {
    return this.#memo === other.#memo;
  }

  equals(other: Point<unknown>): boolean {
    return this.hasSameSource(other) && this.#offset === other.#offset;
  }

  distanceFrom(other: Point<unknown>): number {
    if (!this.hasSameSource(other))
      throw new RangeError('Point is from a different source');

    return this.#offset - other.#offset;
  }

  compareTo(other: Point<unknown>): number {
    return Math.sign(this.distanceFrom(other));
  }
}
