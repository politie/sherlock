import { Derivable, Fallback, SettableDerivable } from '../../interfaces';
import { autoCacheMode, connect, getState, unresolved } from '../../symbols';
import { isRecordingObservations, maybeDisconnectInNextTick } from '../../tracking';
import { ErrorWrapper } from '../../utils';
import { Atom } from '../atom';
import { BaseDerivable } from '../base-derivable';
import { derivationStackDepth } from '../derivation';
import { resolveFallback } from '../resolve-fallback';

function maybeConnectAndGetState<V>(bs: BaseDerivable<V>) {
    // Should we connect now?
    if (!bs.connected) {
        if (bs[autoCacheMode]) {
            // We will connect because of autoCacheMode, after a tick we may need to disconnect (if no reactor was started
            // in this tick).
            bs[connect]();
            maybeDisconnectInNextTick(bs);
        } else if (isRecordingObservations()) {
            // We know we need to connect if isRecordingObservations() returns true (in which case our observer is connecting
            // and therefore recording its dependencies).
            bs[connect]();
        }
    }

    return bs[getState]();
}

export function valueGetter<V>(this: BaseDerivable<V>): V | undefined {
    const state = maybeConnectAndGetState(this);
    return state === unresolved || state instanceof ErrorWrapper ? undefined : state;
}

export function valueSetter<V>(this: SettableDerivable<V>, newValue: V) { return this.set(newValue); }

export function getMethod<V>(this: BaseDerivable<V>): V {
    const state = maybeConnectAndGetState(this);
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
    const state = maybeConnectAndGetState(this);
    if (state instanceof ErrorWrapper) {
        throw state.error;
    }
    return state === unresolved ? resolveFallback(fallback) : state;
}

export function resolvedGetter(this: BaseDerivable<any>): boolean {
    const state = maybeConnectAndGetState(this);
    return state !== unresolved;
}

export function erroredGetter(this: BaseDerivable<any>): boolean {
    const state = maybeConnectAndGetState(this);
    return state instanceof ErrorWrapper;
}

export function errorGetter(this: BaseDerivable<any>): any {
    const state = maybeConnectAndGetState(this);
    return state instanceof ErrorWrapper ? state.error : undefined;
}

export function connected$Getter(this: BaseDerivable<any>): Derivable<boolean> {
    return this._connected$ || (this._connected$ = new Atom(this.connected));
}
