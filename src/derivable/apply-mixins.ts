import { Derivable, Fallback, SettableDerivable } from '../interfaces';
import { Atom } from './atom';
import { BaseDerivable } from './base-derivable';
import { PullDataSource } from './data-source';
import { deriveMethod } from './derivation';
import { Lens, lensMethod } from './lens';
import {
    andMethod, connected$Getter, erroredGetter, errorGetter, fallbackToMethod, getMethod, getOrMethod, isMethod, notMethod,
    orMethod, pluckMethod, resolvedGetter, settablePluckMethod, swapMethod, valueGetter, valueSetter,
} from './mixins';

declare module './base-derivable' {
    export interface BaseDerivable<V> {
        get(): V;
        getOr<T>(t: Fallback<T>): V | T;

        readonly value: Derivable<V>['value'];
        readonly resolved: Derivable<V>['resolved'];
        readonly settable: Derivable<V>['settable'];

        readonly errored: Derivable<V>['errored'];
        readonly error: Derivable<V>['error'];

        readonly connected$: Derivable<V>['connected$'];

        readonly derive: Derivable<V>['derive'];
        readonly pluck: Derivable<V>['pluck'];
        readonly fallbackTo: Derivable<V>['fallbackTo'];

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

    errored: { get: erroredGetter },
    error: { get: errorGetter },

    connected$: { get: connected$Getter },

    derive: { value: deriveMethod },
    pluck: { value: pluckMethod },
    fallbackTo: { value: fallbackToMethod },

    and: { value: andMethod },
    or: { value: orMethod },
    not: { value: notMethod },
    is: { value: isMethod },
});

declare module './atom' {
    export interface Atom<V> {
        value: SettableDerivable<V>['value'];
        readonly swap: SettableDerivable<V>['swap'];
        readonly pluck: SettableDerivable<V>['pluck'];
        readonly lens: SettableDerivable<V>['lens'];
    }
}

declare module './data-source' {
    export interface PullDataSource<V> {
        value: SettableDerivable<V>['value'];
        readonly swap: SettableDerivable<V>['swap'];
        readonly pluck: SettableDerivable<V>['pluck'];
        readonly lens: SettableDerivable<V>['lens'];
    }
}

declare module './lens' {
    export interface Lens<V> {
        value: SettableDerivable<V>['value'];
        readonly swap: SettableDerivable<V>['swap'];
        readonly pluck: SettableDerivable<V>['pluck'];
        readonly lens: SettableDerivable<V>['lens'];
    }
}

[Atom, PullDataSource, Lens].forEach(c => Object.defineProperties(c.prototype, {
    value: { get: valueGetter, set: valueSetter },
    swap: { value: swapMethod },
    pluck: { value: settablePluckMethod },
    lens: { value: lensMethod },
}));
