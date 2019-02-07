import { atom, derive } from '../derivable';
import { SettableDerivable } from '../interfaces';
import { atomic, atomically, transact, transaction } from './transaction';

describe('transaction/transaction', () => {
    basicTransactionsTests(atom, true);

    describe('#atomically', () => {
        testAtomically(atomically);
    });

    describe('#atomic', () => {
        describe('as decorator', () => {
            class Decorated {
                @atomic()
                method(f: () => void) {
                    f();
                }
            }
            testAtomically(f => new Decorated().method(f));
        });
        describe('as wrapper', () => {
            testAtomically(f => atomic(f)());

            it('should pass parameters to the original function', () => {
                const func = jest.fn();
                atomic(func)(1, 2, 3, 4, 5);
                expect(func).toHaveBeenCalledTimes(1);
                expect(func).toHaveBeenCalledWith(1, 2, 3, 4, 5);
            });
        });
    });

    describe('#transact', () => {
        testTransaction(transact);
    });

    describe('#transaction', () => {
        describe('as decorator', () => {
            class Decorated {
                @transaction()
                method(f: () => void) {
                    f();
                }
            }
            testTransaction(f => new Decorated().method(f));
        });
        describe('as wrapper', () => {
            testTransaction(f => transaction(f)());

            it('should pass parameters to the original function', () => {
                const func = jest.fn();
                transaction(func)(1, 2, 3, 4, 5);
                expect(func).toHaveBeenCalledTimes(1);
                expect(func).toHaveBeenCalledWith(1, 2, 3, 4, 5);
            });
        });
    });
});

export function basicTransactionsTests(atomFactory: <V>(v: V) => SettableDerivable<V>, shouldRollbackValue: boolean) {
    it('should not react on abort of outer transaction', () => {
        const a$ = atomFactory('a');
        let reactions = 0;
        a$.react(() => reactions++, { skipFirst: true });
        txn(abort => {
            a$.set('b');
            txn(() => {
                a$.set('c');
            });
            expect(a$.get()).toBe('c');
            abort();
        });
        if (shouldRollbackValue) {
            // Atoms get restored to their original value on abort (DataSources don't).
            expect(a$.get()).toBe('a');
        }
        expect(reactions).toBe(0);
    });

    it('should react once for each reactor on commit of outer transaction', () => {
        const a$ = atomFactory('a');
        let reactions = 0;
        a$.react(() => reactions++, { skipFirst: true });
        txn(() => {
            a$.set('b');
            a$.set('c');
            txn(() => {
                a$.set('d');
            });
            expect(a$.get()).toBe('d');
        });
        expect(a$.get()).toBe('d');
        expect(reactions).toBe(1);
    });

    it('should not react when an atom is reset to its previous value', () => {
        const a$ = atomFactory('a');
        let reactions = 0;
        a$.react(() => reactions++, { skipFirst: true });
        txn(() => {
            a$.set('b');
            a$.set('a');
        });
        expect(reactions).toBe(0);
    });

    it('should also react on atoms that were only changed inside a nested transaction', () => {
        const a$ = atomFactory('a');
        let reactions = 0;
        a$.react(() => reactions++, { skipFirst: true });
        txn(() => {
            txn(() => {
                a$.set('b');
            });
            expect(a$.get()).toBe('b');
        });
        expect(a$.get()).toBe('b');
        expect(reactions).toBe(1);
    });

    it('should support adding a reactor to an atom after it was reassigned inside a transaction', () => {
        const a$ = atomFactory('a');
        const derived$ = derive(() => `${a$.value}!`);
        let reactions = 0;
        let value: string | undefined;
        txn(() => {
            a$.set('b');
            txn(() => {
                derived$.react(v => { reactions++; value = v; });
                expect(reactions).toBe(1);
                expect(value).toBe('b!');
                a$.set('c');
            });
            expect(a$.get()).toBe('c');
        });
        expect(reactions).toBe(2);
        expect(value).toBe('c!');
    });

    it('should fully support derivations inside transactions that abort', () => {
        const a$ = atomFactory('a');
        const b$ = atomFactory('b');
        const derived$ = derive(() => `${a$.value} ${b$.value}`);
        let reactions = 0;
        derived$.react(() => reactions++, { skipFirst: true });
        expect(derived$.get()).toBe('a b');
        txn(outerAbort => {
            a$.set('b');
            expect(derived$.get()).toBe('b b');
            txn(innerAbort => {
                b$.set('c');
                expect(derived$.get()).toBe('b c');
                innerAbort();
            });
            expect(derived$.get()).toBe(shouldRollbackValue ? 'b b' : 'b c');
            outerAbort();
        });
        expect(derived$.get()).toBe(shouldRollbackValue ? 'a b' : 'b c');
        expect(reactions).toBe(0);
    });

    it('should fully support derivations inside transactions that commit', () => {
        const a$ = atomFactory('a');
        const derived$ = derive(() => `${a$.value}!`);
        let reactions = 0;
        let value: string | undefined;
        derived$.react(v => { reactions++; value = v; }, { skipFirst: true });
        expect(derived$.get()).toBe('a!');
        txn(() => {
            txn(() => {
                a$.set('b');
                expect(derived$.get()).toBe('b!');
            });
            expect(derived$.get()).toBe('b!');
        });
        expect(derived$.get()).toBe('b!');
        expect(reactions).toBe(1);
        expect(value).toBe('b!');
    });

    it('should support transactions inside reactions', () => {
        const a$ = atomFactory('a');
        const b$ = atomFactory('b');
        const derived$ = derive(() => `${a$.value} ${b$.value}`);
        derived$.react(d => txn(abort => {
            expect(d).toBe('a b');
            a$.set('b');
            b$.set('c');
            expect(derived$.get()).toBe('b c');
            abort();
        }));
    });
}

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
    expect(abortCalled).toBe(false);
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
                expect(a$.get()).toBe('b');
                // Should rollback the transaction...
                throw expected;
            });
        } catch (e) {
            if (e !== expected) {
                throw e;
            }
        }
        // Transaction was rolled back, so we expect 'a' here.
        expect(a$.get()).toBe('a');
    });

    it('should not start a new transaction if one is already active', () => {
        const a$ = atom('a');
        const expected = {};
        runAtomically(() => {
            try {
                runAtomically(() => {
                    a$.set('b');
                    expect(a$.get()).toBe('b');
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
        expect(a$.get()).toBe('b');
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
                    expect(a$.get()).toBe('b');
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
        expect(a$.get()).toBe('a');
    });
}
