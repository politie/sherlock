/**
 * Calls the provided dyadic function with respectively the current and previous value that was received by the returned monadic function.
 * In other words, when you wrap a function with wrapPreviousState you not only get the current value, but also the previous one (as a
 * second parameter).
 *
 * @param f the function to wrap
 */
export function pairwise<V, R>(f: (newValue: V, oldValue?: V) => R): (value: V) => R;

/**
 * Calls the provided dyadic function with respectively the current and previous value that was received by the returned monadic function.
 * In other words, when you wrap a function with wrapPreviousState you not only get the current value, but also the previous one (as a
 * second parameter).
 *
 * @param f the function to wrap
 * @param init the value to use the first time as second argument to `f`.
 */
export function pairwise<V, R>(f: (newValue: V, oldValue: V) => R, init: V): (value: V) => R;

export function pairwise<C, V, R>(f: (this: C, newValue: V, oldValue: V | undefined) => R, init?: V): (this: C, value: V) => R {
    let oldValue = init;
    return function wrapped(newValue) {
        const result = f.call(this, newValue, oldValue);
        oldValue = newValue;
        return result;
    };
}
