import { describe, expect, it, vi } from 'vitest';

import { Stream } from './Stream.js';

describe('Stream', () => {
  describe('peek', () => {
    it('must return the next value without consuming it', () => {
      const stream = new Stream([1, 2, 3]);

      expect(stream.peek()).toBe(1);
      expect(stream.peek()).toBe(1);
    });

    it('must return undefined when the source is exhausted', () => {
      const stream = new Stream([]);

      expect(stream.peek()).toBeUndefined();
    });

    it('must pull from the underlying iterator at most once per position', () => {
      const next = vi
        .fn<() => IteratorResult<number>>()
        .mockReturnValueOnce({ done: false, value: 1 })
        .mockReturnValue({ done: true, value: undefined });

      const stream = new Stream({
        [Symbol.iterator]: () => ({ next }),
      });

      stream.peek();
      stream.peek();
      stream.peek();

      expect(next).toHaveBeenCalledOnce();
    });

    it('must not re-invoke the iterator once it reports exhaustion', () => {
      const next = vi
        .fn<() => IteratorResult<number>>()
        .mockReturnValueOnce({ done: false, value: 1 })
        .mockReturnValue({ done: true, value: undefined });

      const stream = new Stream({
        [Symbol.iterator]: () => ({ next }),
      });

      stream.next();
      stream.next();
      stream.peek();
      stream.next();

      expect(next).toHaveBeenCalledTimes(2);
    });

    it('must advance on next when a yielded result omits done', () => {
      const next = vi
        .fn<() => IteratorResult<number>>()
        .mockReturnValueOnce({ value: 1 })
        .mockReturnValueOnce({ value: 2 })
        .mockReturnValue({ done: true, value: undefined });

      const stream = new Stream({
        [Symbol.iterator]: () => ({ next }),
      });

      expect(stream.next()).toBe(1);
      expect(stream.next()).toBe(2);
    });
  });

  describe('next', () => {
    it('must return values in order and advance the stream', () => {
      const stream = new Stream([1, 2, 3]);

      expect(stream.next()).toBe(1);
      expect(stream.next()).toBe(2);
      expect(stream.next()).toBe(3);
    });

    it('must return undefined once the source is exhausted', () => {
      const stream = new Stream([1]);

      stream.next();

      expect(stream.next()).toBeUndefined();
      expect(stream.next()).toBeUndefined();
    });
  });

  describe('consumeIf', () => {
    it('must consume and return the peeked value when the predicate matches', () => {
      const stream = new Stream([1, 2, 3]);

      expect(stream.consumeIf(value => value === 1)).toBe(1);
      expect(stream.peek()).toBe(2);
    });

    it('must leave the value unconsumed and return undefined when the predicate does not match', () => {
      const stream = new Stream([1, 2, 3]);

      expect(stream.consumeIf(value => value === 2)).toBeUndefined();
      expect(stream.peek()).toBe(1);
    });

    it('must return undefined without invoking the predicate when the source is exhausted', () => {
      const stream = new Stream([]);
      const predicate = vi.fn(() => true);

      expect(stream.consumeIf(predicate)).toBeUndefined();
      expect(predicate).not.toHaveBeenCalled();
    });

    it('must narrow and return the value when given a type guard', () => {
      const stream = new Stream<string | number>(['a', 1]);

      const result = stream.consumeIf(
        (value): value is string => typeof value === 'string'
      );

      expect(result?.toUpperCase()).toBe('A');
    });
  });

  describe('consumeWhile', () => {
    it('must consume and return every leading value that matches the predicate', () => {
      const stream = new Stream([1, 2, 3, 4]);

      expect(stream.consumeWhile(value => value < 3)).toEqual([1, 2]);
      expect(stream.peek()).toBe(3);
    });

    it('must return an empty array when the first value does not match', () => {
      const stream = new Stream([1, 2, 3]);

      expect(stream.consumeWhile(value => value > 1)).toEqual([]);
      expect(stream.peek()).toBe(1);
    });

    it('must return an empty array when the source is exhausted', () => {
      const stream = new Stream([]);

      expect(stream.consumeWhile(() => true)).toEqual([]);
    });

    it('must narrow and return every leading value that matches a type guard', () => {
      const stream = new Stream<string | number>(['a', 'b', 1]);

      const result = stream.consumeWhile(
        (value): value is string => typeof value === 'string'
      );

      expect(result.map(value => value.toUpperCase())).toEqual(['A', 'B']);
    });
  });
});
