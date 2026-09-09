import { type NonNegative } from '@fundamentry/number';

export interface Seekable {
  tell(): NonNegative;
  seek(position: NonNegative): void;
}

export interface Peekable<T> {
  peek(): T | undefined;
  next(): T | undefined;
}

export interface Consumable<T = unknown> {
  consumeIf<S extends T>(predicate: (value: T) => value is S): S | undefined;
  consumeIf(predicate: (value: T) => boolean): T | undefined;
}
