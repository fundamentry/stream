import { describe, expect, it, vi } from 'vitest';

import {
  nonNegativeInteger,
  type NonNegativeInteger,
} from '@fundamentry/number';

import { Memo } from './Memo.js';

const source = (...values: number[]) => {
  const next = vi.fn<() => IteratorResult<number>>();

  values.forEach(value => next.mockReturnValueOnce({ done: false, value }));

  next.mockReturnValue({ done: true, value: undefined });

  return { next, iterable: { [Symbol.iterator]: () => ({ next }) } };
};

describe('Memo', () => {
  describe('constructor', () => {
    it('must not pull from the source', () => {
      const { next, iterable } = source(1);

      expect(new Memo(iterable)).toBeInstanceOf(Memo);
      expect(next).not.toHaveBeenCalled();
    });

    it('must create a memo that is assignable to a memo of a wider type', () => {
      const memo: Memo<number | string> = new Memo<number>([1]);

      expect(memo.get(nonNegativeInteger(0))).toBe(1);
    });
  });

  describe('has', () => {
    it('must return true for an index the source can produce', () => {
      const memo = new Memo([1, 2, 3]);

      expect(memo.has(nonNegativeInteger(0))).toBe(true);
      expect(memo.has(nonNegativeInteger(2))).toBe(true);
    });

    it('must return false for an index past the end of the source', () => {
      const memo = new Memo([1, 2]);

      expect(memo.has(nonNegativeInteger(2))).toBe(false);
    });

    it('must return false for an empty source', () => {
      expect(new Memo([]).has(nonNegativeInteger(0))).toBe(false);
    });

    it('must return true for a value that is legitimately undefined', () => {
      const memo = new Memo([undefined]);

      expect(memo.has(nonNegativeInteger(0))).toBe(true);
    });

    it('must pull only as far as the requested index', () => {
      const { next, iterable } = source(1, 2, 3);

      new Memo(iterable).has(nonNegativeInteger(1));

      expect(next).toHaveBeenCalledTimes(2);
    });

    it('must not re-pull values that are already buffered', () => {
      const { next, iterable } = source(1, 2, 3);

      const memo = new Memo(iterable);

      memo.has(nonNegativeInteger(2));
      memo.has(nonNegativeInteger(0));
      memo.has(nonNegativeInteger(2));

      expect(next).toHaveBeenCalledTimes(3);
    });

    it('must not re-pull from the source once it reports exhaustion', () => {
      const { next, iterable } = source(1);

      const memo = new Memo(iterable);

      memo.has(nonNegativeInteger(5));
      memo.has(nonNegativeInteger(5));
      memo.has(nonNegativeInteger(1));

      expect(next).toHaveBeenCalledTimes(2);
    });

    it('must keep every value buffered before the source throws', () => {
      let calls = 0;
      const memo = new Memo({
        [Symbol.iterator]: () => ({
          next: (): IteratorResult<number> => {
            calls += 1;
            if (calls === 2) throw new Error('boom');
            return calls < 4
              ? { done: false, value: calls }
              : { done: true, value: undefined };
          },
        }),
      });

      expect(() => memo.has(nonNegativeInteger(2))).toThrow('boom');
      expect(memo.slice(nonNegativeInteger(0), nonNegativeInteger(1))).toEqual([
        1,
      ]);
      expect(memo.has(nonNegativeInteger(1))).toBe(true);
      expect(memo.slice(nonNegativeInteger(0), nonNegativeInteger(3))).toEqual([
        1, 3,
      ]);
    });
  });

  describe('reaches', () => {
    it('must return true for offset 0, even for an empty source', () => {
      expect(new Memo([]).reaches(nonNegativeInteger(0))).toBe(true);
    });

    it('must return true for every offset up to and including the end', () => {
      const memo = new Memo([1, 2]);

      expect(memo.reaches(nonNegativeInteger(1))).toBe(true);
      expect(memo.reaches(nonNegativeInteger(2))).toBe(true);
    });

    it('must return false for an offset past the end', () => {
      expect(new Memo([1, 2]).reaches(nonNegativeInteger(3))).toBe(false);
    });

    it('must return false for an offset that is not an integer', () => {
      expect(new Memo([1, 2]).reaches(1.5 as NonNegativeInteger)).toBe(false);
    });

    it('must return false for an infinite offset without pulling from the source', () => {
      const { next, iterable } = source(1);

      expect(new Memo(iterable).reaches(Infinity as NonNegativeInteger)).toBe(
        false
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('must pull only as far as the value before the offset', () => {
      const { next, iterable } = source(1, 2, 3);

      new Memo(iterable).reaches(nonNegativeInteger(2));

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('get', () => {
    it('must return the value at the index', () => {
      const memo = new Memo([1, 2, 3]);

      expect(memo.get(nonNegativeInteger(0))).toBe(1);
      expect(memo.get(nonNegativeInteger(2))).toBe(3);
    });

    it('must return the same value when read repeatedly or out of order', () => {
      const memo = new Memo([1, 2, 3]);

      expect(memo.get(nonNegativeInteger(2))).toBe(3);
      expect(memo.get(nonNegativeInteger(0))).toBe(1);
      expect(memo.get(nonNegativeInteger(2))).toBe(3);
    });

    it('must return undefined for an index past the end of the source', () => {
      const memo = new Memo([1]);

      expect(memo.get(nonNegativeInteger(1))).toBeUndefined();
    });

    it('must pull from the source as needed', () => {
      const { next, iterable } = source(1, 2, 3);

      expect(new Memo(iterable).get(nonNegativeInteger(1))).toBe(2);
      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('slice', () => {
    it('must return the values from start up to but excluding end', () => {
      const memo = new Memo([1, 2, 3, 4]);

      expect(memo.slice(nonNegativeInteger(1), nonNegativeInteger(3))).toEqual([
        2, 3,
      ]);
    });

    it('must pull from the source as needed', () => {
      const { next, iterable } = source(1, 2, 3);

      expect(
        new Memo(iterable).slice(nonNegativeInteger(0), nonNegativeInteger(2))
      ).toEqual([1, 2]);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('must stop at the end of the source', () => {
      const memo = new Memo([1, 2]);

      expect(memo.slice(nonNegativeInteger(1), nonNegativeInteger(5))).toEqual([
        2,
      ]);
    });

    it('must return an empty array when start is not before end', () => {
      const { next, iterable } = source(1, 2, 3);

      const memo = new Memo(iterable);

      expect(memo.slice(nonNegativeInteger(1), nonNegativeInteger(1))).toEqual(
        []
      );
      expect(memo.slice(nonNegativeInteger(2), nonNegativeInteger(1))).toEqual(
        []
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('must include values that are legitimately undefined', () => {
      const memo = new Memo([1, undefined, 3]);

      expect(memo.slice(nonNegativeInteger(0), nonNegativeInteger(3))).toEqual([
        1,
        undefined,
        3,
      ]);
    });

    it('must return a copy that does not expose the buffer', () => {
      const memo = new Memo([1, 2]);

      memo.slice(nonNegativeInteger(0), nonNegativeInteger(2)).push(99);

      expect(memo.slice(nonNegativeInteger(0), nonNegativeInteger(3))).toEqual([
        1, 2,
      ]);
    });
  });
});
