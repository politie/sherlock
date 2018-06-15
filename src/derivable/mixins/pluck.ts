import { clone } from '../../utils';
import { Derivable, SettableDerivable } from '../interfaces';

export type PluckKey = string | number | Derivable<string | number>;

export function pluckMethod<V>(this: Derivable<V>, key: PluckKey): Derivable<any> {
    return this.derive(plucker, key);
}

export function settablePluckMethod<V>(this: SettableDerivable<V>, key: PluckKey): SettableDerivable<any> {
    return this.lens({ get: plucker, set: pluckSetter }, key);
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
