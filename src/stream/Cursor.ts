import { type Consumable, type Peekable } from '#project/type';

export abstract class Cursor<T> implements Peekable<T>, Consumable<T> {
  abstract peek(): T | undefined;

  abstract next(): T | undefined;

  abstract isAtEnd(): boolean;

  consumeIf<S extends T>(predicate: (value: T) => value is S): S | undefined;

  consumeIf(predicate: (value: T) => boolean): T | undefined;

  consumeIf(predicate: (value: T) => boolean): T | undefined {
    const value = this.peek();

    return value !== undefined && predicate(value) ? this.next() : undefined;
  }

  consumeWhile<S extends T>(predicate: (value: T) => value is S): S[];

  consumeWhile(predicate: (value: T) => boolean): T[];

  consumeWhile(predicate: (value: T) => boolean): T[] {
    const result: T[] = [];

    for (;;) {
      const value = this.consumeIf(predicate);

      if (value === undefined) break;

      result.push(value);
    }

    return result;
  }
}
