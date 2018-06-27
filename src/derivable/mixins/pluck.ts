import { Derivable, SettableDerivable, Unwrappable } from '../../interfaces';
import { config } from '../../utils';

export function pluckMethod<V>(this: Derivable<V>, key: Unwrappable<string | number>): Derivable<any> {
    return this.derive(config.plucker.get, key);
}

export function settablePluckMethod<V>(this: SettableDerivable<V>, key: Unwrappable<string | number>): SettableDerivable<any> {
    return this.lens(config.plucker, key);
}
