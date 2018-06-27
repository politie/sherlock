import { _internal, Derivable, DerivableAtom, derive, ReactorOptions, SettableDerivable } from '@politie/sherlock';

export type StateObject<V> =
    { value: V, error?: undefined, errored: false, resolved: true } |
    { value?: undefined, error: any, errored: true, resolved: true } |
    { errored: false, resolved: false };

export function getState<V>(from: Derivable<V>): StateObject<V> {
    const state = from[_internal.symbols.getState]();
    if (state === _internal.symbols.unresolved) {
        return { errored: false, resolved: false };
    }
    if (state instanceof _internal.ErrorWrapper) {
        const { error } = state;
        return { error, errored: true, resolved: true };
    }
    return { value: state, errored: false, resolved: true };
}

export function materialize<V>(derivable: Derivable<V>): Derivable<StateObject<V>> {
    return derive(() => getState(derivable));
}

export function dematerialize<V>(derivable: Derivable<StateObject<V>>): Derivable<V> {
    return derivable.derive(state => {
        if (state.errored) {
            return new _internal.ErrorWrapper(state.error);
        }
        if (state.resolved) {
            return state.value;
        }
        return _internal.symbols.unresolved;
    });
}

export function setState<V>(to: SettableDerivable<V> & DerivableAtom, state: StateObject<V>) {
    if (!state.resolved) {
        to.unset();
    } else if (state.errored) {
        to.setError(state.error);
    } else {
        to.set(state.value);
    }
}

export function syncState<V>(from: Derivable<V>, to: SettableDerivable<V> & DerivableAtom, opts?: Partial<ReactorOptions<StateObject<V>>>) {
    return materialize(from).react(state => setState(to, state), opts);
}

export function copyState<V>(from: Derivable<V>, to: SettableDerivable<V> & DerivableAtom) {
    setState(to, getState(from));
}
