import { describe, expect, it, vi } from 'vitest';

import { nonNegative } from '@fundamentry/number';

import { Point } from './Point.js';

describe('Point', () => {
  describe('of', () => {
    it('must start at the beginning of the source', () => {
      const point = Point.of([1, 2, 3]);

      expect(point.equals(point.at(nonNegative(0)))).toBe(true);
    });

    it('must not pull from the source until a value is needed', () => {
      const next = vi.fn<() => IteratorResult<number>>();

      Point.of({ [Symbol.iterator]: () => ({ next }) });

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('distanceFrom', () => {
    it('must return the number of values between an earlier point and this one', () => {
      const start = Point.of([1, 2, 3]);
      const { rest } = start.span(value => value < 3);

      expect(rest.distanceFrom(start)).toBe(2);
    });

    it('must return a negative number for a later point', () => {
      const start = Point.of([1, 2, 3]);
      const { rest } = start.span(value => value < 3);

      expect(start.distanceFrom(rest)).toBe(-2);
    });

    it('must return 0 for a point at the same offset', () => {
      const point = Point.of([1, 2, 3]);

      expect(point.distanceFrom(point.at(nonNegative(0)))).toBe(0);
    });

    it('must throw a RangeError for a point from a different source', () => {
      const point = Point.of([1, 2, 3]);

      expect(() => point.distanceFrom(Point.of([1, 2, 3]))).toThrow(
        new RangeError('Point is from a different source')
      );
    });
  });

  describe('peek', () => {
    it('must return the value at its offset without advancing', () => {
      const point = Point.of([1, 2, 3]);

      expect(point.peek()).toBe(1);
      expect(point.peek()).toBe(1);
    });

    it('must return undefined when the source is exhausted', () => {
      const point = Point.of([]);

      expect(point.peek()).toBeUndefined();
    });
  });

  describe('isAtEnd', () => {
    it('must return false when there is a value at its offset', () => {
      expect(Point.of([1]).isAtEnd()).toBe(false);
    });

    it('must return true when the source starts empty', () => {
      expect(Point.of([]).isAtEnd()).toBe(true);
    });

    it('must return false for a value that is undefined, distinguishing it from exhaustion', () => {
      const point = Point.of([undefined]);

      expect(point.isAtEnd()).toBe(false);
      expect(point.peek()).toBeUndefined();
    });
  });

  describe('step', () => {
    it('must return the value and a point at the next offset', () => {
      const point = Point.of([1, 2, 3]);

      const result = point.step();

      expect(result?.value).toBe(1);
      expect(result?.rest.distanceFrom(point)).toBe(1);
      expect(result?.rest.peek()).toBe(2);
    });

    it('must leave the original point unchanged', () => {
      const point = Point.of([1, 2, 3]);

      point.step();

      expect(point.peek()).toBe(1);
    });

    it('must return undefined once the source is exhausted', () => {
      const point = Point.of([1]);

      expect(point.step()?.rest.step()).toBeUndefined();
    });

    it('must step over a value that is legitimately undefined', () => {
      const point = Point.of([1, undefined, 3]);

      const second = point.step()?.rest.step();

      expect(second).toBeDefined();
      expect(second?.value).toBeUndefined();
      expect(second?.rest.peek()).toBe(3);
    });
  });

  describe('stepIf', () => {
    it('must step when the predicate matches', () => {
      const point = Point.of([1, 2, 3]);

      const result = point.stepIf(value => value === 1);

      expect(result?.value).toBe(1);
      expect(result?.rest.distanceFrom(point)).toBe(1);
    });

    it('must return undefined when the predicate does not match', () => {
      const point = Point.of([1, 2, 3]);

      expect(point.stepIf(value => value === 2)).toBeUndefined();
    });

    it('must return undefined without calling the predicate at the end', () => {
      const predicate = vi.fn(() => true);

      expect(Point.of([]).stepIf(predicate)).toBeUndefined();
      expect(predicate).not.toHaveBeenCalled();
    });

    it('must narrow the value when given a type guard', () => {
      const point = Point.of<string | number>(['a', 1]);

      const result = point.stepIf(
        (value): value is string => typeof value === 'string'
      );

      expect(result?.value.toUpperCase()).toBe('A');
    });
  });

  describe('span', () => {
    it('must collect every leading value that matches the predicate', () => {
      const point = Point.of([1, 2, 3, 4]);

      const { values, rest } = point.span(value => value < 3);

      expect(values).toEqual([1, 2]);
      expect(rest.distanceFrom(point)).toBe(2);
      expect(rest.peek()).toBe(3);
    });

    it('must return an empty span and the same offset when the first value does not match', () => {
      const point = Point.of([1, 2, 3]);

      const { values, rest } = point.span(value => value > 1);

      expect(values).toEqual([]);
      expect(rest.equals(point)).toBe(true);
    });

    it('must stop at the end of the source', () => {
      const { values, rest } = Point.of([1, 2]).span(() => true);

      expect(values).toEqual([1, 2]);
      expect(rest.isAtEnd()).toBe(true);
    });

    it('must narrow every value when given a type guard', () => {
      const point = Point.of<string | number>(['a', 'b', 1]);

      const { values } = point.span(
        (value): value is string => typeof value === 'string'
      );

      expect(values.map(value => value.toUpperCase())).toEqual(['A', 'B']);
    });

    it('must leave the original point unchanged for other branches to read from', () => {
      const start = Point.of('abc');

      const a = start.stepIf(value => value === 'x');
      const b = start.span(value => value !== 'c');

      expect(a).toBeUndefined();
      expect(b.values).toEqual(['a', 'b']);
      expect(start.peek()).toBe('a');
    });

    it('must not re-pull values already read through another point', () => {
      const next = vi
        .fn<() => IteratorResult<number>>()
        .mockReturnValueOnce({ done: false, value: 1 })
        .mockReturnValueOnce({ done: false, value: 2 })
        .mockReturnValue({ done: true, value: undefined });

      const start = Point.of({ [Symbol.iterator]: () => ({ next }) });

      start.span(() => true);
      start.span(() => true);
      start.step()?.rest.step();

      expect(next).toHaveBeenCalledTimes(3);
    });

    it('must leave the original point readable when the source throws', () => {
      let calls = 0;
      const source = {
        [Symbol.iterator]: () => ({
          next: (): IteratorResult<number> => {
            calls += 1;
            if (calls === 2) throw new Error('boom');
            return calls < 4
              ? { done: false, value: calls }
              : { done: true, value: undefined };
          },
        }),
      };

      const start = Point.of(source);

      expect(() => start.span(() => true)).toThrow('boom');
      expect(start.peek()).toBe(1);
      expect(start.span(() => true).values).toEqual([1, 3]);
    });
  });

  describe('at', () => {
    it('must return a point at an earlier offset', () => {
      const start = Point.of([1, 2, 3]);
      const { rest } = start.span(() => true);

      const point = rest.at(nonNegative(1));

      expect(point.distanceFrom(start)).toBe(1);
      expect(point.peek()).toBe(2);
    });

    it('must return a point at a later offset, pulling from the source as needed', () => {
      const start = Point.of([1, 2, 3]);

      const point = start.at(nonNegative(2));

      expect(point.distanceFrom(start)).toBe(2);
      expect(point.peek()).toBe(3);
    });

    it('must succeed at exactly the end of the source', () => {
      const point = Point.of([1, 2]).at(nonNegative(2));

      expect(point.isAtEnd()).toBe(true);
    });

    it('must throw a RangeError past what the source can produce', () => {
      expect(() => Point.of([1, 2]).at(nonNegative(5))).toThrow(
        new RangeError("Invalid offset: '5'")
      );
    });

    it('must throw a RangeError for an offset that is not an integer', () => {
      expect(() => Point.of([1, 2]).at(nonNegative(1.5))).toThrow(
        new RangeError("Invalid offset: '1.5'")
      );
    });

    it('must return a point from the same source unchanged', () => {
      const start = Point.of([1, 2, 3]);
      const { rest } = start.span(() => true);

      expect(start.at(rest)).toBe(rest);
    });

    it('must throw a RangeError for a point from a different source', () => {
      const point = Point.of([1, 2, 3]);

      expect(() => point.at(Point.of([1, 2, 3]))).toThrow(
        new RangeError('Point is from a different source')
      );
    });

    it('must throw a RangeError for an infinite offset without reading the source', () => {
      const next = vi.fn<() => IteratorResult<number>>();

      const point = Point.of({ [Symbol.iterator]: () => ({ next }) });

      expect(() => point.at(nonNegative(Infinity))).toThrow(
        new RangeError("Invalid offset: 'Infinity'")
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('hasSameSource', () => {
    it('must return true for the same point', () => {
      const point = Point.of([1, 2, 3]);

      expect(point.hasSameSource(point)).toBe(true);
    });

    it('must return true for a point at a different offset in the same source', () => {
      const start = Point.of([1, 2, 3]);
      const { rest } = start.span(() => true);

      expect(start.hasSameSource(rest)).toBe(true);
      expect(rest.hasSameSource(start)).toBe(true);
    });

    it('must return false for a point from a different source with the same values', () => {
      expect(Point.of([1, 2, 3]).hasSameSource(Point.of([1, 2, 3]))).toBe(
        false
      );
    });

    it('must accept a point of a different value type', () => {
      expect(Point.of([1]).hasSameSource(Point.of(['a']))).toBe(false);
    });

    it('must not pull from the source', () => {
      const next = vi.fn<() => IteratorResult<number>>();

      const point = Point.of({ [Symbol.iterator]: () => ({ next }) });

      point.hasSameSource(point);

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('equals', () => {
    it('must return true for the same point', () => {
      const point = Point.of([1, 2, 3]);

      expect(point.equals(point)).toBe(true);
    });

    it('must return true for a distinct point at the same offset in the same source', () => {
      const start = Point.of([1, 2, 3]);

      const back = start.at(nonNegative(1)).at(nonNegative(0));

      expect(back).not.toBe(start);
      expect(start.equals(back)).toBe(true);
    });

    it('must return false for a point at a different offset in the same source', () => {
      const start = Point.of([1, 2, 3]);
      const { rest } = start.span(() => true);

      expect(start.equals(rest)).toBe(false);
    });

    it('must return false for a point at the same offset in a different source', () => {
      expect(Point.of([1, 2, 3]).equals(Point.of([1, 2, 3]))).toBe(false);
    });

    it('must accept a point of a different value type', () => {
      expect(Point.of([1]).equals(Point.of(['a']))).toBe(false);
    });
  });

  describe('compareTo', () => {
    it('must return -1 when the point is before the other', () => {
      const start = Point.of([1, 2, 3]);
      const { rest } = start.span(() => true);

      expect(start.compareTo(rest)).toBe(-1);
    });

    it('must return 1 when the point is after the other', () => {
      const start = Point.of([1, 2, 3]);
      const { rest } = start.span(() => true);

      expect(rest.compareTo(start)).toBe(1);
    });

    it('must return 0 for a point at the same offset in the same source', () => {
      const start = Point.of([1, 2, 3]);

      const back = start.at(nonNegative(1)).at(nonNegative(0));

      expect(start.compareTo(back)).toBe(0);
    });

    it('must throw a RangeError for a point from a different source', () => {
      const point = Point.of([1, 2, 3]);

      expect(() => point.compareTo(Point.of([1, 2, 3]))).toThrow(
        new RangeError('Point is from a different source')
      );
    });

    it('must order points from the same source by offset when sorting', () => {
      const start = Point.of([1, 2, 3]);
      const middle = start.at(nonNegative(1));
      const end = start.at(nonNegative(3));

      const sorted = [end, start, middle].sort((a, b) => a.compareTo(b));

      expect(sorted.map(point => point.distanceFrom(start))).toEqual([0, 1, 3]);
    });
  });
});
