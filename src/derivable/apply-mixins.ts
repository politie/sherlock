import { Derivable, SettableDerivable } from '../interfaces';
import { Atom } from './atom';
import { BaseDerivable } from './base-derivable';
import { DataSource } from './data-source';
import { deriveMethod } from './derivation';
import { Lens, lensMethod } from './lens';
import {
    andMethod, fallbackToMethod, getMethod, getOrMethod, isMethod, notMethod, orMethod, pluckMethod, resolvedGetter, settablePluckMethod,
    swapMethod, valueGetter, valueSetter,
} from './mixins';

declare module './base-derivable' {
    export interface BaseDerivable<V> {
        get(): V;
        getOr<T>(t: T): V;
        readonly value: Derivable<V>['value'];
        readonly resolved: Derivable<V>['resolved'];
        readonly settable: Derivable<V>['settable'];

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
    value: { get: valueGetter },
    get: { value: getMethod },
    getOr: { value: getOrMethod },
    resolved: { get: resolvedGetter },
    settable: { value: false },

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
    export interface DataSource<V> {
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

[Atom, DataSource, Lens].forEach(c => Object.defineProperties(c.prototype, {
    value: { get: valueGetter, set: valueSetter },
    swap: { value: swapMethod },
    pluck: { value: settablePluckMethod },
    lens: { value: lensMethod },
}));
