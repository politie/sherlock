import { Derivable, DerivableAtom, ErrorWrapper, ReactorOptions, State, unresolved } from '@politie/sherlock';

export type StateObject<V> =
    { value: V, errored: false, resolved: true } |
    { error: any, errored: true, resolved: true } |
    { errored: false, resolved: false };

export function getStateObject<V>(from: Derivable<V>): StateObject<V> {
    return toStateObject(from.getState());
}

export function toStateObject<V>(state: State<V>): StateObject<V> {
    if (state === unresolved) {
        return { errored: false, resolved: false };
    }
    if (state instanceof ErrorWrapper) {
        const { error } = state;
        return { error, errored: true, resolved: true };
    }
    return { value: state, errored: false, resolved: true };
}

export function fromStateObject<V>(state: StateObject<V>): State<V> {
    if (state.errored) {
        return new ErrorWrapper(state.error);
    }
    if (state.resolved) {
        return state.value;
    }
    return unresolved;
}

export function materialize<V>(derivable: Derivable<V>): Derivable<StateObject<V>> {
    return derivable.mapState(toStateObject);
}

export function dematerialize<V>(derivable: Derivable<StateObject<V>>): Derivable<V> {
    return derivable.map(fromStateObject);
}

export function setStateObject<V>(to: DerivableAtom<V>, state: StateObject<V>) {
    if (!state.resolved) {
        to.unset();
    } else if (state.errored) {
        to.setError(state.error);
    } else {
        to.set(state.value);
    }
}

export function syncState<V>(from: Derivable<V>, to: DerivableAtom<V>, opts?: Partial<ReactorOptions<StateObject<V>>>) {
    return materialize(from).react(state => setStateObject(to, state), opts);
}

export function copyState<V>(from: Derivable<V>, to: DerivableAtom<V>) {
    setStateObject(to, getStateObject(from));
}
