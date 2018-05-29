import { Derivable, derivation } from '../derivable';
import { unpack } from '../utils';

/**
 * Performs JavaScript `&&` operation on the provided arguments after unpacking.
 *
 * @method
 */
export const and = andOrImpl(v => !v);

/**
 * Performs JavaScript `||` operation on the provided arguments after unpacking.
 *
 * @method
 */
export const or = andOrImpl(v => !!v);

/**
 * Returns the first operand that is not `null` or `undefined` after unpacking.
 *
 * @method
 */
export const firstNotNull = andOrImpl(v => v != null);

function andOrImpl(breakOn: (v: any) => boolean) {
    return <V>(...args: Array<Derivable<V> | V>) => derivation(() => {
        let value: V | undefined;
        for (const arg of args) {
            value = unpack(arg);
            if (breakOn(value)) {
                break;
            }
        }
        return value!;
    });
}
