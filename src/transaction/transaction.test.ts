import { atom } from '../derivable';
import { atomic, atomically, transact, transaction } from './transaction';
import { basicTransactionsTests } from './transaction.tests';

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
