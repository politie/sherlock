import { _internal, atom, derive } from '@politie/sherlock';
import { expect } from 'chai';
import { peek, peekState, peekValue } from './peek';
import { fromStateObject, toStateObject } from './state';

describe('sherlock-utils/peek', () => {
    it('should return the current value of the provided Derivable without observations', () => {
        const v$ = atom(123);
        expect(checkNoObservations(() => peek(v$))).to.equal(123);

        const u$ = atom.unresolved();
        expect(() => checkNoObservations(() => peek(u$))).to.throw(Error, 'derivable is unresolved');

        const e$ = atom.error(new Error('the message'));
        expect(() => checkNoObservations(() => peek(e$))).to.throw(Error, 'the message');
    });
});

describe('sherlock-utils/peekState', () => {
    it('should return the current state of the provided Derivable without observations', () => {
        const v$ = atom(123);
        expect(checkNoObservations(() => peekState(v$))).to.equal(v$.getState());

        const u$ = atom.unresolved();
        expect(checkNoObservations(() => peekState(u$))).to.equal(u$.getState());

        const e$ = atom.error(new Error('the message'));
        expect(checkNoObservations(() => peekState(e$))).to.deep.equal(e$.getState());
    });
});

describe('sherlock-utils/peekValue', () => {
    it('should return the current value of the provided Derivable without observations', () => {
        const v$ = atom(123);
        expect(checkNoObservations(() => peekValue(v$))).to.equal(v$.value);

        const u$ = atom.unresolved();
        expect(checkNoObservations(() => peekValue(u$))).to.equal(u$.value);

        const e$ = atom.error(new Error('the message'));
        expect(checkNoObservations(() => peekValue(e$))).to.equal(e$.value);
    });
});

function checkNoObservations<T>(fn: () => T) {
    const derivation = derive(() => toStateObject(fn())).autoCache();
    const result = derivation.get();
    expect(derivation[_internal.symbols.dependencies], 'Sherlock dependencies should not have been added').to.be.empty;
    return fromStateObject(result);
}
