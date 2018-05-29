import { Derivable, derivation } from '../derivable';
import { unpack } from '../utils';

/**
 * A template literal tag to create a string derivation using a template literal.
 *
 * For example:
 *
 * ```
 * const name$ = atom('Pete');
 * const age$ = atom(24);
 * const nameAndAge$ = template`${name$} is ${age$} years old`;
 * nameAndAge$.get(); // -> Pete is 24 years old
 * ```
 *
 * @param parts the string parts
 * @param args the results of the expressions inside the template literal
 */
export function template(parts: TemplateStringsArray, ...args: any[]): Derivable<string> {
    return derivation(() => {
        let s = '';
        for (let i = 0; i < parts.length; i++) {
            s += parts[i];
            if (i < args.length) {
                s += unpack(args[i]);
            }
        }
        return s;
    });
}
