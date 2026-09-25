import { Cursor } from './Cursor.js';

export class Stream<out T> extends Cursor<T> {
  readonly #iterator: Iterator<T>;

  #lookahead: IteratorResult<T> | undefined;

  constructor(source: Iterable<T>) {
    super();

    this.#iterator = source[Symbol.iterator]();
  }

  override peek(): T | undefined {
    this.#lookahead ??= this.#iterator.next();

    return this.#lookahead.done ? undefined : this.#lookahead.value;
  }

  override next(): T | undefined {
    const value = this.peek();

    if (!this.#lookahead?.done) this.#lookahead = undefined;

    return value;
  }

  override isAtEnd(): boolean {
    this.peek();

    return !!this.#lookahead?.done;
  }
}
