import { expect } from 'chai';
import { spy } from 'sinon';
import { atom } from '../derivable';
import { template } from '../extras';
import { atomic, atomically, transact, transaction } from './transaction';

describe('transaction/transaction', () => {
    it('should not react on abort of outer transaction', () => {
        const a$ = atom('a');
        let reactions = 0;
        a$.react(() => reactions++, { skipFirst: true });
        txn(abort => {
            a$.set('b');
            txn(() => {
                a$.set('c');
            });
            expect(a$.value).to.equal('c');
            abort();
        });
        expect(reactions).to.equal(0);
    });

    it('should react once for each reactor on commit of outer transaction', () => {
        const a$ = atom('a');
        let reactions = 0;
        a$.react(() => reactions++, { skipFirst: true });
        txn(() => {
            a$.set('b');
            a$.set('c');
            txn(() => {
                a$.set('d');
            });
            expect(a$.value).to.equal('d');
        });
        expect(reactions).to.equal(1);
    });

    it('should not react when an atom is reset to its previous value', () => {
        const a$ = atom('a');
        let reactions = 0;
        a$.react(() => reactions++, { skipFirst: true });
        txn(() => {
            a$.set('b');
            a$.set('a');
        });
        expect(reactions).to.equal(0);
    });

    it('should also react on atoms that were only changed inside a nested transaction', () => {
        const a$ = atom('a');
        let reactions = 0;
        a$.react(() => reactions++, { skipFirst: true });
        txn(() => {
            txn(() => {
                a$.set('b');
            });
            expect(a$.value).to.equal('b');
        });
        expect(reactions).to.equal(1);
    });

    it('should support adding a reactor to an atom after it was reassigned inside a transaction', () => {
        const a$ = atom('a');
        const derived$ = template`${a$}!`;
        let reactions = 0;
        let value: string | undefined;
        txn(() => {
            a$.set('b');
            txn(() => {
                derived$.react(v => { reactions++; value = v; });
                expect(reactions).to.equal(1);
                expect(value).to.equal('b!');
                a$.set('c');
            });
            expect(a$.value).to.equal('c');
        });
        expect(reactions).to.equal(2);
        expect(value).to.equal('c!');
    });

    it('should fully support derivations inside transactions that abort', () => {
        const a$ = atom('a');
        const b$ = atom('b');
        const derived$ = template`${a$} ${b$}`;
        let reactions = 0;
        derived$.react(() => reactions++, { skipFirst: true });
        expect(derived$.get()).to.equal('a b');
        txn(outerAbort => {
            a$.set('b');
            expect(derived$.get()).to.equal('b b');
            txn(innerAbort => {
                b$.set('c');
                expect(derived$.get()).to.equal('b c');
                innerAbort();
            });
            expect(derived$.get()).to.equal('b b');
            outerAbort();
        });
        expect(derived$.get()).to.equal('a b');
        expect(reactions).to.equal(0);
    });

    it('should fully support derivations inside transactions that commit', () => {
        const a$ = atom('a');
        const derived$ = template`${a$}!`;
        let reactions = 0;
        let value: string | undefined;
        derived$.react(v => { reactions++; value = v; }, { skipFirst: true });
        expect(derived$.get()).to.equal('a!');
        txn(() => {
            txn(() => {
                a$.set('b');
                expect(derived$.get()).to.equal('b!');
            });
            expect(derived$.get()).to.equal('b!');
        });
        expect(derived$.get()).to.equal('b!');
        expect(reactions).to.equal(1);
        expect(value).to.equal('b!');
    });

    it('should support transactions inside reactions', () => {
        const a$ = atom('a');
        const b$ = atom('b');
        const derived$ = template`${a$} ${b$}`;
        derived$.react(d => txn(abort => {
            expect(d).to.equal('a b');
            a$.set('b');
            b$.set('c');
            expect(derived$.get()).to.equal('b c');
            abort();
        }));
    });

    describe('#atomically', () => {
        testAtomically(atomically);
    });

    describe('#atomic', () => {
        context('as decorator', () => {
            class Decorated {
                @atomic()
                method(f: () => void) {
                    f();
                }
            }
            testAtomically(f => new Decorated().method(f));
        });
        context('as wrapper', () => {
            testAtomically(f => atomic(f)());

            it('should pass parameters to the original function', () => {
                const func = spy();
                atomic(func)(1, 2, 3, 4, 5);
                expect(func).to.have.been.calledOnce
                    .and.to.have.been.calledWithExactly(1, 2, 3, 4, 5);
            });
        });
    });

    describe('#transact', () => {
        testTransaction(transact);
    });

    describe('#transaction', () => {
        context('as decorator', () => {
            class Decorated {
                @transaction()
                method(f: () => void) {
                    f();
                }
            }
            testTransaction(f => new Decorated().method(f));
        });
        context('as wrapper', () => {
            testTransaction(f => transaction(f)());

            it('should pass parameters to the original function', () => {
                const func = spy();
                transaction(func)(1, 2, 3, 4, 5);
                expect(func).to.have.been.calledOnce
                    .and.to.have.been.calledWithExactly(1, 2, 3, 4, 5);
            });
        });
    });
});

const ABORT = {};
export function txn<R>(f: (abort: () => void) => R): R | undefined {
    let abortCalled = false;
    let result: R;
    try {
        result = transact(() => f(abort));
    } catch (e) {
        if (e === ABORT) {
            return;
        }
        throw e;
    }
    expect(abortCalled).to.equal(false, 'abort was called, but error was not delivered');
    return result;

    function abort() {
        abortCalled = true;
        throw ABORT;
    }
}

function testAtomically(runAtomically: (f: () => void) => void) {
    it('should start a new transaction if one is not already active', () => {
        const a$ = atom('a');
        const expected = {};
        try {
            runAtomically(() => {
                a$.set('b');
                expect(a$.get()).to.equal('b');
                // Should rollback the transaction...
                throw expected;
            });
        } catch (e) {
            if (e !== expected) {
                throw e;
            }
        }
        // Transaction was rolled back, so we expect 'a' here.
        expect(a$.get()).to.equal('a');
    });

    it('should not start a new transaction if one is already active', () => {
        const a$ = atom('a');
        const expected = {};
        runAtomically(() => {
            try {
                runAtomically(() => {
                    a$.set('b');
                    expect(a$.get()).to.equal('b');
                    // Would rollback a transaction if it were present...
                    // spoiler: it isn't.
                    throw expected;
                });
            } catch (e) {
                if (e !== expected) {
                    throw e;
                }
            }
        });
        // Transaction was not rolled back, so we expect 'b' here.
        expect(a$.get()).to.equal('b');
    });
}

function testTransaction(runTransaction: (f: () => void) => void) {
    it('should always start a new transaction even if one is already active', () => {
        const a$ = atom('a');
        const expected = {};
        runTransaction(() => {
            try {
                runTransaction(() => {
                    a$.set('b');
                    expect(a$.get()).to.equal('b');
                    // Should rollback a transaction if it is present...
                    throw expected;
                });
            } catch (e) {
                if (e !== expected) {
                    throw e;
                }
            }
        });
        // Transaction was not rolled back, so we expect 'b' here.
        expect(a$.get()).to.equal('a');
    });
}
