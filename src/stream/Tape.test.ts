import { describe, expect, it, vi } from 'vitest';

import { nonNegative } from '@fundamentry/number';

import { Tape } from './Tape.js';

describe('Tape', () => {
  describe('peek', () => {
    it('must return the next value without consuming it', () => {
      const tape = new Tape([1, 2, 3]);

      expect(tape.peek()).toBe(1);
      expect(tape.peek()).toBe(1);
    });

    it('must return undefined when the source is exhausted', () => {
      const tape = new Tape([]);

      expect(tape.peek()).toBeUndefined();
    });

    it('must pull from the underlying source at most once per position', () => {
      const next = vi
        .fn<() => IteratorResult<number>>()
        .mockReturnValueOnce({ done: false, value: 1 })
        .mockReturnValue({ done: true, value: undefined });

      const tape = new Tape({ [Symbol.iterator]: () => ({ next }) });

      tape.peek();
      tape.peek();
      tape.next();
      tape.seek(nonNegative(0));
      tape.peek();

      expect(next).toHaveBeenCalledOnce();
    });

    it('must not re-pull from the source once it reports exhaustion', () => {
      const next = vi
        .fn<() => IteratorResult<number>>()
        .mockReturnValueOnce({ done: false, value: 1 })
        .mockReturnValue({ done: true, value: undefined });

      const tape = new Tape({ [Symbol.iterator]: () => ({ next }) });

      tape.next();
      tape.peek();
      tape.peek();
      tape.next();

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('next', () => {
    it('must return values in order and advance the tape', () => {
      const tape = new Tape([1, 2, 3]);

      expect(tape.next()).toBe(1);
      expect(tape.next()).toBe(2);
      expect(tape.next()).toBe(3);
    });

    it('must return undefined once the source is exhausted', () => {
      const tape = new Tape([1]);

      tape.next();

      expect(tape.next()).toBeUndefined();
      expect(tape.next()).toBeUndefined();
    });
  });

  describe('tell', () => {
    it('must return 0 before anything has been consumed', () => {
      const tape = new Tape([1, 2, 3]);

      expect(tape.tell()).toBe(0);
    });

    it('must return the number of values consumed so far', () => {
      const tape = new Tape([1, 2, 3]);

      tape.next();
      tape.next();

      expect(tape.tell()).toBe(2);
    });

    it('must not advance past the number of values the source actually produced', () => {
      const tape = new Tape([1]);

      tape.next();
      tape.next();

      expect(tape.tell()).toBe(1);
    });
  });

  describe('seek', () => {
    it('must rewind to a previously consumed position', () => {
      const tape = new Tape([1, 2, 3]);

      tape.next();
      tape.next();
      tape.seek(nonNegative(0));

      expect(tape.tell()).toBe(0);
      expect(tape.next()).toBe(1);
    });

    it('must seek forward, pulling from the source as needed', () => {
      const tape = new Tape([1, 2, 3]);

      tape.seek(nonNegative(2));

      expect(tape.tell()).toBe(2);
      expect(tape.next()).toBe(3);
    });

    it('must allow seeking to the current position as a no-op', () => {
      const tape = new Tape([1, 2, 3]);

      tape.next();
      tape.seek(nonNegative(1));

      expect(tape.tell()).toBe(1);
      expect(tape.next()).toBe(2);
    });

    it('must succeed when seeking exactly to the end of the source', () => {
      const tape = new Tape([1, 2]);

      tape.seek(nonNegative(2));

      expect(tape.tell()).toBe(2);
    });

    it('must throw a RangeError when seeking past what the source can produce', () => {
      const tape = new Tape([1, 2]);

      expect(() => tape.seek(nonNegative(5))).toThrow(
        new RangeError("Invalid seek position: '5'")
      );
    });

    it('must leave the position unchanged when a seek fails', () => {
      const tape = new Tape([1, 2]);

      tape.next();

      expect(() => tape.seek(nonNegative(5))).toThrow(
        new RangeError("Invalid seek position: '5'")
      );
      expect(tape.tell()).toBe(1);
      expect(tape.next()).toBe(2);
    });

    it('must not re-pull already-buffered values when seeking backward and forward again', () => {
      const next = vi
        .fn<() => IteratorResult<number>>()
        .mockReturnValueOnce({ done: false, value: 1 })
        .mockReturnValueOnce({ done: false, value: 2 })
        .mockReturnValue({ done: true, value: undefined });

      const tape = new Tape({ [Symbol.iterator]: () => ({ next }) });

      tape.next();
      tape.next();
      tape.seek(nonNegative(0));
      tape.seek(nonNegative(2));

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('consumeIf', () => {
    it('must consume and return the peeked value when the predicate matches', () => {
      const tape = new Tape([1, 2, 3]);

      expect(tape.consumeIf(value => value === 1)).toBe(1);
      expect(tape.tell()).toBe(1);
    });

    it('must leave the value unconsumed and return undefined when the predicate does not match', () => {
      const tape = new Tape([1, 2, 3]);

      expect(tape.consumeIf(value => value === 2)).toBeUndefined();
      expect(tape.tell()).toBe(0);
    });

    it('must narrow and return the value when given a type guard', () => {
      const tape = new Tape<string | number>(['a', 1]);

      const result = tape.consumeIf(
        (value): value is string => typeof value === 'string'
      );

      expect(result?.toUpperCase()).toBe('A');
    });
  });

  describe('consumeWhile', () => {
    it('must consume and return every leading value that matches the predicate', () => {
      const tape = new Tape([1, 2, 3, 4]);

      expect(tape.consumeWhile(value => value < 3)).toEqual([1, 2]);
      expect(tape.tell()).toBe(2);
    });

    it('must return an empty array when the first value does not match', () => {
      const tape = new Tape([1, 2, 3]);

      expect(tape.consumeWhile(value => value > 1)).toEqual([]);
      expect(tape.tell()).toBe(0);
    });

    it('must narrow and return every leading value that matches a type guard', () => {
      const tape = new Tape<string | number>(['a', 'b', 1]);

      const result = tape.consumeWhile(
        (value): value is string => typeof value === 'string'
      );

      expect(result.map(value => value.toUpperCase())).toEqual(['A', 'B']);
    });
  });
});
