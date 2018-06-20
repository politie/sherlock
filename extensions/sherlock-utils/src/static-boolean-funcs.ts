import { Derivable, derive, unwrap } from '@politie/sherlock';

/**
 * Performs JavaScript `&&` operation on the provided arguments after unwraping.
 *
 * @method
 */
export const and = andOrImpl(v => !v);

/**
 * Performs JavaScript `||` operation on the provided arguments after unwraping.
 *
 * @method
 */
export const or = andOrImpl(v => !!v);

/**
 * Returns the first operand that is not `null` or `undefined` after unwraping.
 *
 * @method
 */
export const firstNotNull = andOrImpl(v => v != null);

function andOrImpl(breakOn: (v: any) => boolean) {
    return <V>(...args: Array<Derivable<V> | V>) => derive(() => {
        let value: V | undefined;
        for (const arg of args) {
            value = unwrap(arg);
            if (breakOn(value)) {
                break;
            }
        }
        return value!;
    });
}
