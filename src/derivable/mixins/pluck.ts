import { clone } from '../../utils';
import { Derivable, SettableDerivable } from '../derivable';
import { Lensable } from '../lens.interface';

/**
 * The `pluck` method, to add to a Derivable Prototype.
 *
 * Create a derivation that plucks the property with the given key of the current value of the Derivable.
 */
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

function hasLens<V>(obj: Derivable<V>): obj is Derivable<V> & Lensable<V> {
    return typeof (obj as SettableDerivable<V>).lens === 'function';
}
