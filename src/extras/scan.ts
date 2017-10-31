/**
 * Converts an accumulator function into a monadic function. On each call to the returned monadic function, the accumulator function is
 * called with the value that was passed to the monadic function and the result of the last invocation of the accumulator function. It
 * works similar to {@link Array#reduce}, but returns each intermediate result. If the seed is specified, then that value will be used
 * as the initial value for the accumulator.
 *
 * @param f the function to wrap
 */
export function scan<V, R>(f: (acc: R | undefined, value: V) => R): (value: V) => R;

/**
 * Converts an accumulator function into a monadic function. On each call to the returned monadic function, the accumulator function is
 * called with the value that was passed to the monadic function and the result of the last invocation of the accumulator function. It
 * works similar to {@link Array#reduce}, but returns each intermediate result. If the seed is specified, then that value will be used
 * as the initial value for the accumulator.
 *
 * @param f the function to wrap
 * @param seed the value to use the first time as second argument to `f`.
 */
export function scan<V, R>(f: (acc: R, value: V) => R, seed: R): (value: V) => R;

export function scan<C, V, R>(f: (this: C, acc: R | undefined, value: V) => R, seed?: R): (this: C, value: V) => R {
    let acc = seed;
    return function wrapped(value) {
        return acc = f.call(this, acc, value);
    };
}
