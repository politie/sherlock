import { Derivable, SettableDerivable, Unwrappable } from '../../interfaces';
import { config } from '../../utils';
import { lens } from '../factories';
import { isDerivable } from '../typeguards';

export function pluckMethod<V>(this: Derivable<V>, key: Unwrappable<string | number>): Derivable<any> {
    const { get } = config.plucker;
    if (isDerivable(key)) {
        return this.derive(get, key);
    }
    return this.map(v => get(v, key));
}

export function settablePluckMethod<V>(this: SettableDerivable<V>, key: Unwrappable<string | number>): SettableDerivable<any> {
    const { get, set } = config.plucker;
    if (isDerivable(key)) {
        return lens({
            get: () => get(this.get(), key.get()),
            set: newValue => this.set(set(newValue, this.value, key.get())),
        });
    }
    return this.map(
        baseValue => get(baseValue, key),
        newValue => set(newValue, this.value, key),
    );
}
