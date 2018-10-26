import { _internal, Derivable, State } from '@politie/sherlock';

/**
 * Returns the current state of the provided Derivable without registering any dependencies while in a derivation. Comparable to #getState().
 */
export function peekState<T>(d: Derivable<T>): State<T> {
    return _internal.independentTracking(() => d.getState());
}

/**
 * Returns the current value of the provided Derivable without registering any dependencies while in a derivation. Comparable to #get().
 */
export function peek<T>(d: Derivable<T>): T {
    return _internal.independentTracking(() => d.get());
}

/**
 * Returns the current value of the provided Derivable without registering any dependencies while in a derivation. Comparable to #value.
 */
export function peekValue<T>(d: Derivable<T>): T | undefined {
    return _internal.independentTracking(() => d.value);
}
