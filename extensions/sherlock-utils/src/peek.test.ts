import { _internal, atom, derive } from '@politie/sherlock';
import { peek, peekState, peekValue } from './peek';
import { fromStateObject, toStateObject } from './state';

describe('sherlock-utils/peek', () => {
    it('should return the current value of the provided Derivable without observations', () => {
        const v$ = atom(123);
        expect(checkNoObservations(() => peek(v$))).toBe(123);

        const u$ = atom.unresolved();
        expect(() => checkNoObservations(() => peek(u$))).toThrowError(Error);

        const e$ = atom.error(new Error('the message'));
        expect(() => checkNoObservations(() => peek(e$))).toThrowError(Error);
    });
});

describe('sherlock-utils/peekState', () => {
    it('should return the current state of the provided Derivable without observations', () => {
        const v$ = atom(123);
        expect(checkNoObservations(() => peekState(v$))).toBe(v$.getState());

        const u$ = atom.unresolved();
        expect(checkNoObservations(() => peekState(u$))).toBe(u$.getState());

        const e$ = atom.error(new Error('the message'));
        expect(checkNoObservations(() => peekState(e$))).toEqual(e$.getState());
    });
});

describe('sherlock-utils/peekValue', () => {
    it('should return the current value of the provided Derivable without observations', () => {
        const v$ = atom(123);
        expect(checkNoObservations(() => peekValue(v$))).toBe(v$.value);

        const u$ = atom.unresolved();
        expect(checkNoObservations(() => peekValue(u$))).toBe(u$.value);

        const e$ = atom.error(new Error('the message'));
        expect(checkNoObservations(() => peekValue(e$))).toBe(e$.value);
    });
});

function checkNoObservations<T>(fn: () => T) {
    const derivation = derive(() => toStateObject(fn())).autoCache();
    const result = derivation.get();
    expect(derivation[_internal.symbols.dependencies]).toHaveLength(0);
    return fromStateObject(result);
}
