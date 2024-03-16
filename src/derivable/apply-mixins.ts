import { Derivable, DerivableAtom, Fallback, SettableDerivable } from '../interfaces';
import { Atom } from './atom';
import { BaseDerivable } from './base-derivable';
import { PullDataSource } from './data-source';
import { deriveMethod } from './derivation';
import { Lens } from './lens';
import { BiMapping, mapMethod, mapStateMethod } from './map';
import {
    andMethod, connected$Getter, erroredGetter, errorGetter, fallbackToMethod, finalGetter, flatMapMethod, getMethod, getOrMethod, isMethod, notMethod,
    orMethod, pluckMethod, resolvedGetter, setErrorMethod, setFinalMethod, settablePluckMethod, swapMethod, takeMethod, unsetMethod, valueGetter, valueSetter,
} from './mixins';

declare module './base-derivable' {
    export interface BaseDerivable<V> {
        get(): V;
        getOr<T>(t: Fallback<T>): V | T;

        readonly value: Derivable<V>['value'];
        readonly resolved: Derivable<V>['resolved'];
        readonly settable: Derivable<V>['settable'];
        readonly final: Derivable<V>['final'];

        readonly errored: Derivable<V>['errored'];
        readonly error: Derivable<V>['error'];

        readonly connected$: Derivable<V>['connected$'];

        readonly derive: Derivable<V>['derive'];
        readonly map: Derivable<V>['map'];
        readonly mapState: Derivable<V>['mapState'];
        readonly flatMap: Derivable<V>['flatMap'];
        readonly pluck: Derivable<V>['pluck'];
        readonly fallbackTo: Derivable<V>['fallbackTo'];

        readonly take: Derivable<V>['take'];

        readonly and: Derivable<V>['and'];
        readonly or: Derivable<V>['or'];
        readonly not: Derivable<V>['not'];
        readonly is: Derivable<V>['is'];
    }
}

Object.defineProperties(BaseDerivable.prototype, {
    get: { value: getMethod },
    getOr: { value: getOrMethod },

    value: { get: valueGetter },
    resolved: { get: resolvedGetter },
    settable: { value: false },
    final: { get: finalGetter },

    errored: { get: erroredGetter },
    error: { get: errorGetter },

    connected$: { get: connected$Getter },

    derive: { value: deriveMethod },
    map: { value: mapMethod },
    mapState: { value: mapStateMethod },
    flatMap: { value: flatMapMethod },
    pluck: { value: pluckMethod },
    fallbackTo: { value: fallbackToMethod },

    take: { value: takeMethod },

    and: { value: andMethod },
    or: { value: orMethod },
    not: { value: notMethod },
    is: { value: isMethod },
});

declare module './atom' {
    export interface Atom<V> {
        value: SettableDerivable<V>['value'];

        readonly unset: DerivableAtom<V>['unset'];
        readonly setError: DerivableAtom<V>['setError'];
        readonly setFinal: DerivableAtom<V>['setFinal'];
        readonly map: DerivableAtom<V>['map'];
        readonly mapState: DerivableAtom<V>['mapState'];

        readonly swap: SettableDerivable<V>['swap'];
        readonly pluck: SettableDerivable<V>['pluck'];
    }
}

declare module './data-source' {
    export interface PullDataSource<V> {
        value: SettableDerivable<V>['value'];

        readonly map: SettableDerivable<V>['map'];
        readonly mapState: SettableDerivable<V>['mapState'];

        readonly swap: SettableDerivable<V>['swap'];
        readonly pluck: SettableDerivable<V>['pluck'];
    }
}

declare module './lens' {
    export interface Lens<V> {
        value: SettableDerivable<V>['value'];

        readonly map: SettableDerivable<V>['map'];
        readonly mapState: SettableDerivable<V>['mapState'];

        readonly swap: SettableDerivable<V>['swap'];
        readonly pluck: SettableDerivable<V>['pluck'];
        readonly settable: true;
    }
}

declare module './map' {
    export interface BiMapping<B, V> {
        value: SettableDerivable<V>['value'];

        readonly unset: DerivableAtom<V>['unset'];
        readonly setError: DerivableAtom<V>['setError'];
        readonly setFinal: DerivableAtom<V>['setFinal'];
        readonly map: DerivableAtom<V>['map'];
        readonly mapState: DerivableAtom<V>['mapState'];

        readonly swap: SettableDerivable<V>['swap'];
        readonly pluck: SettableDerivable<V>['pluck'];
    }
}

[Atom, PullDataSource, BiMapping, Lens].forEach(c => Object.defineProperties(c.prototype, {
    value: { get: valueGetter, set: valueSetter },
    swap: { value: swapMethod },
    pluck: { value: settablePluckMethod },
}));
[Atom, BiMapping].forEach(c => Object.defineProperties(c.prototype, {
    unset: { value: unsetMethod },
    setError: { value: setErrorMethod },
    setFinal: { value: setFinalMethod },
}));
Object.defineProperties(Lens.prototype, {
    settable: { value: true },
});
