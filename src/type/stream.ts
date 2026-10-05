import { type NonNegativeInteger } from '@fundamentry/number';

export interface Seekable {
  tell(): NonNegativeInteger;
  seek(position: NonNegativeInteger): void;
}

export interface Peekable<out T> {
  peek(): T | undefined;
  next(): T | undefined;
}

export interface Consumable<out T = unknown> {
  consumeIf<S extends T>(predicate: (value: T) => value is S): S | undefined;
  consumeIf(predicate: (value: T) => boolean): T | undefined;
}
