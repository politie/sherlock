import { _internal, Derivable, DerivableAtom, SettableDerivable } from '@politie/sherlock';

export function copyState<V>(from: Derivable<V>, to: SettableDerivable<V> & DerivableAtom) {
    const state = (from as _internal.BaseDerivable<V>)[_internal.symbols.getState]();
    (to as _internal.Atom<V>).set(state);
}
