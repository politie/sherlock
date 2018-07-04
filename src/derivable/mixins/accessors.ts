import { Derivable, Fallback, SettableDerivable } from '../../interfaces';
import { unresolved } from '../../symbols';
import { ErrorWrapper } from '../../utils';
import { Atom } from '../atom';
import { BaseDerivable } from '../base-derivable';
import { derivationStackDepth } from '../derivation';
import { resolveFallback } from '../resolve-fallback';

export function valueGetter<V>(this: BaseDerivable<V>): V | undefined {
    const state = this.getState();
    return state === unresolved || state instanceof ErrorWrapper ? undefined : state;
}

export function valueSetter<V>(this: SettableDerivable<V>, newValue: V) { return this.set(newValue); }

export function getMethod<V>(this: BaseDerivable<V>): V {
    const state = this.getState();
    if (state instanceof ErrorWrapper) {
        throw state.error;
    }
    if (state !== unresolved) {
        return state;
    }
    if (derivationStackDepth > 0) {
        throw unresolved;
    }
    throw new Error('Could not get value, derivable is not (yet) resolved');
}

export function getOrMethod<V, T>(this: BaseDerivable<V>, fallback: Fallback<T>): V | T {
    const state = this.getState();
    if (state instanceof ErrorWrapper) {
        throw state.error;
    }
    return state === unresolved ? resolveFallback(fallback) : state;
}

export function resolvedGetter(this: BaseDerivable<any>): boolean {
    return this.getState() !== unresolved;
}

export function erroredGetter(this: BaseDerivable<any>): boolean {
    return this.getState() instanceof ErrorWrapper;
}

export function errorGetter(this: BaseDerivable<any>): any {
    const state = this.getState();
    return state instanceof ErrorWrapper ? state.error : undefined;
}

export function connected$Getter(this: BaseDerivable<any>): Derivable<boolean> {
    return this._connected$ || (this._connected$ = new Atom(this.connected));
}
