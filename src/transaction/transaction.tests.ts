import { derive } from '../derivable';
import { SettableDerivable } from '../interfaces';
import { FinalWrapper } from '../utils';
import { transact } from './transaction';

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
        const reactor = jest.fn();
        a$.react(reactor, { skipFirst: true });
        txn(() => {
            a$.set('b');
            a$.set('a');
        });
        expect(reactor).not.toHaveBeenCalled();
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

    shouldRollbackValue && it('should allow rollbacking to final inside a nested transaction', () => {
        const a$ = atomFactory('a');
        const d$ = a$.derive(v => v + '!');
        const reactor = jest.fn();
        d$.react(reactor, { skipFirst: true });
        expect(d$.value).toBe('a!');
        txn(() => {
            a$.set('b');
            txn(abort => {
                a$.set(FinalWrapper.wrap('c') as any);
                expect(d$.value).toBe('c!');
                expect(a$.final).toBeTrue();
                expect(d$.final).toBeTrue();
                abort();
            });
            a$.set('d');
        });
        expect(a$.value).toBe('d');
        expect(a$.final).toBeFalse();
        expect(reactor).toHaveBeenCalledTimes(1);

        txn(abort => {
            a$.set('b');
            txn(() => {
                a$.set(FinalWrapper.wrap('c') as any);
                expect(d$.value).toBe('c!');
                expect(a$.final).toBeTrue();
                expect(d$.final).toBeTrue();
            });
            expect(a$.final).toBeTrue();
            expect(d$.final).toBeTrue();
            abort();
        });
        expect(a$.value).toBe('d');
        expect(a$.final).toBeFalse();
        expect(reactor).toHaveBeenCalledTimes(1);
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
