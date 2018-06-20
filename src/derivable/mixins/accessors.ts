import { Fallback, SettableDerivable } from '../../interfaces';
import { BaseDerivable } from '../base-derivable';
import { derivationStackDepth } from '../derivation';
import { resolveFallback } from '../resolve-fallback';
import { getValueOrUnresolved, unresolved } from '../symbols';

export function valueGetter<V>(this: BaseDerivable<V>) {
    const value = this[getValueOrUnresolved]();
    return value === unresolved ? undefined : value;
}

export function valueSetter<V>(this: SettableDerivable<V>, newValue: V) { return this.set(newValue); }

export function getMethod<V>(this: BaseDerivable<V>): V {
    const value = this[getValueOrUnresolved]();
    if (value !== unresolved) {
        return value;
    }
    if (derivationStackDepth > 0) {
        throw unresolved;
    }
    throw new Error('Could not get value, derivable is not (yet) resolved');
}

export function getOrMethod<V, T>(this: BaseDerivable<V>, fallback: Fallback<T>): V | T {
    const value = this[getValueOrUnresolved]();
    return value === unresolved ? resolveFallback(fallback) : value;
}

export function resolvedGetter(this: BaseDerivable<any>) {
    return this[getValueOrUnresolved]() !== unresolved;
}
