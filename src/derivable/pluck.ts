import { clone } from '../utils';
import { Atom } from './atom';
import { Derivable } from './derivable';

export interface DerivablePluck<V> {
    /**
     * Create a derivation that plucks the property with the given key of the current value of the Derivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    <K extends keyof V>(key: K | Derivable<K>): Derivable<V[K]>;
    (key: string | number | Derivable<string | number>): Derivable<any>;
}

export interface AtomPluck<V> {
    /**
     * Create a derivation that plucks the property with the given key of the current value of the Derivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    <K extends keyof V>(key: K | Derivable<K>): Atom<V[K]>;
    (key: string | number | Derivable<string | number>): Atom<any>;
}

export function pluck<V>(this: Derivable<V>, key: string | number | Derivable<string | number>): Derivable<any> {
    return hasLens(this)
        ? this.lens({ get: plucker, set: pluckSetter }, key)
        : this.derive(plucker, key);
}

function plucker(obj: any, key: string | number) {
    return hasGetter(obj)
        ? obj.get(key)
        : obj[key];
}

function hasGetter(obj: any): obj is { get(key: string | number): any } {
    return obj && typeof obj.get === 'function';
}

function pluckSetter(newValue: any, object: any, key: string | number) {
    if (hasGetter(object)) {
        if (hasSetter(object)) {
            return object.set(key, newValue);
        }
        throw new Error('object is readonly');
    }
    const result = clone(object);
    result[key] = newValue;
    return result;
}

function hasSetter(obj: any): obj is { set(key: string | number, value: any): any } {
    return typeof obj.set === 'function';
}

function hasLens<V>(obj: Derivable<V>): obj is Derivable<V> & Pick<Atom<V>, 'lens'> {
    return typeof (obj as Atom<V>).lens === 'function';
}
