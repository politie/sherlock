import { Derivable, MaybeFinalState, TakeOptions, TakeOptionValue } from '../../interfaces';
import { unresolved } from '../../symbols';
import { equals, ErrorWrapper, FinalWrapper } from '../../utils';
import { Atom } from '../atom';
import { BaseDerivable } from '../base-derivable';
import { Derivation } from '../derivation';
import { unwrap } from '../unwrap';

const true$ = new Atom(FinalWrapper.wrap(true));
const false$ = new Atom(FinalWrapper.wrap(false));
const skipped = Symbol('skipped');
const finalSkipped = FinalWrapper.wrap(skipped);

export function takeMethod<V>(this: Derivable<V>, { from, when, until, once, stopOnError, skipFirst }: Partial<TakeOptions<V>>): Derivable<V> {
    // From is true by default, once it becomes true, it will stay true.
    const from$ = toMaybeDerivable(from, this, true, true);
    // When is true by default.
    const when$ = toMaybeDerivable(when, this, true);
    // Until is false by default, once it becomes true, it will stay true.
    const until$ = toMaybeDerivable(until, this, false, true);
    // SkipFirst is false by default, once it becomes false again, it will stay false.
    const skipFirstState$ = skipFirst ? new Atom<MaybeFinalState<V> | typeof skipped>(unresolved) : undefined;

    if (!from$ && !when$ && !until$ && !once && !stopOnError && !skipFirstState$) {
        return this;
    }

    const previousState$ = (until$ || when$) && new Atom<V>(unresolved);
    function resultingState(value: MaybeFinalState<V>) {
        previousState$ && previousState$.set(value);
        return value;
    }

    return new Derivation<V>(() => {
        if (from$ && !from$.get()) {
            return resultingState(unresolved);
        }
        if (until$ && until$.get()) {
            return resultingState(FinalWrapper.wrap(previousState$!._value));
        }
        if (when$ && !when$.value) {
            return previousState$!._value;
        }
        const state = this.getMaybeFinalState();
        if (skipFirstState$ && (!finalSkipped.equals(skipFirstState$._value))) {
            if (!isValue(state)) {
                return resultingState(state);
            }
            if (skipFirstState$._value === unresolved && isValue(state) || equals(state, skipFirstState$._value)) {
                skipFirstState$.set(state);
                return resultingState(unresolved);
            }
            skipFirstState$.set(finalSkipped);
        }
        return resultingState(once && isValue(state) || stopOnError && state instanceof ErrorWrapper
            ? FinalWrapper.wrap(state)
            : state);
    });
}

function toMaybeDerivable<V>(option: TakeOptionValue<V> | undefined, derivable: Derivable<V>, defaultValue: boolean, finalValue?: boolean) {
    if (option === undefined) {
        return;
    }
    const knownConstant = option ? true$ : false$;
    if (option === defaultValue || option === knownConstant ||
        option instanceof Atom && option._value instanceof FinalWrapper && option._value.value === defaultValue) {
        return;
    }
    if (typeof option === 'function') {
        const fn = option;
        option = new Derivation(() => fn(derivable)).derive(unwrap);
    }
    if (option instanceof BaseDerivable) {
        if (finalValue !== undefined) {
            option = option.mapState<boolean>(v => v === finalValue ? FinalWrapper.wrap(v) : v);
        }
        return option;
    }
    return knownConstant;
}

function isValue<V>(state: MaybeFinalState<V>): state is V | FinalWrapper<V> {
    const s = FinalWrapper.unwrap(state);
    return s !== unresolved && !(s instanceof ErrorWrapper);
}
