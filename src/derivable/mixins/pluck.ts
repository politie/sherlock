import { config } from '../../utils';
import { Derivable, SettableDerivable } from '../interfaces';

export type PluckKey = string | number | Derivable<string | number>;

export function pluckMethod<V>(this: Derivable<V>, key: PluckKey): Derivable<any> {
    return this.derive(config.plucker.get, key);
}

export function settablePluckMethod<V>(this: SettableDerivable<V>, key: PluckKey): SettableDerivable<any> {
    return this.lens(config.plucker, key);
}
