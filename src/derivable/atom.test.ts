import { Seq } from 'immutable';
import { Derivable } from '../interfaces';
import { react, shouldHaveReactedOnce, shouldNotHaveReacted } from '../reactor/testutils.tests';
import { unresolved } from '../symbols';
import { txn } from '../transaction/transaction.tests';
import { ErrorWrapper } from '../utils';
import { Atom } from './atom';
import { $, testDerivable } from './base-derivable.tests';
import { atom, constant, derive } from './factories';

describe('derivable/atom', () => {
    describe('(write enabled)', () => {
        testDerivable(
            v => v === unresolved ? atom.unresolved() : v instanceof ErrorWrapper ? atom.error(v.error) : atom(v),
            'atom', 'settable',
        );
    });

    describe('(read only)', () => {
        testDerivable(v => v === unresolved ? constant.unresolved() : v instanceof ErrorWrapper ? constant.error(v.error) : constant(v), 'final');
    });

    describe('#set', () => {
        it('should change the current state and version', () => {
            const a$ = $(atom('a'));
            expect(a$.get()).toBe('a');
            expect(a$.version).toBe(0);

            a$.set('b');
            expect(a$.get()).toBe('b');
            expect(a$.version).toBe(1);
        });

        it('should not update the version if the new value equals the previous value', () => {
            const a$ = $(atom('a'));
            expect(a$.get()).toBe('a');
            expect(a$.version).toBe(0);
            a$.set('a');
            expect(a$.get()).toBe('a');
            expect(a$.version).toBe(0);

            // Using the utils.equals function
            const imm$ = $(atom(Seq.Indexed.of(1, 2, 3)));
            expect(Seq.Indexed.of(1, 2, 3).equals(imm$.get())).toBeTrue();
            expect(imm$.version).toBe(0);
            imm$.set(Seq.Indexed.of(1, 2).concat(3).toIndexedSeq());
            expect(Seq.Indexed.of(1, 2, 3).equals(imm$.get())).toBeTrue();
            expect(imm$.version).toBe(0);
            imm$.set(Seq.Indexed.of(1, 2));
            expect(Seq.Indexed.of(1, 2).equals(imm$.get())).toBeTrue();
            expect(imm$.version).toBe(1);
        });

        it('should reset the unresolved status', () => {
            const a$ = atom.unresolved<string>();
            expect(a$.resolved).toBe(false);
            a$.set('value');
            expect(a$.resolved).toBe(true);
        });
    });

    describe('in transactions', () => {
        it('should be restored on abort', () => {
            const a$ = new Atom('a');
            expect(a$._value).toBe('a');
            expect(a$.version).toBe(0);
            txn(abortOuter => {
                a$.set('b');
                expect(a$._value).toBe('b');
                expect(a$.version).toBe(1);
                txn(abortInner => {
                    a$.set('c');
                    expect(a$._value).toBe('c');
                    expect(a$.version).toBe(2);
                    abortInner();
                });
                expect(a$._value).toBe('b');
                expect(a$.version).toBe(1);
                abortOuter();
            });
            expect(a$._value).toBe('a');
            expect(a$.version).toBe(0);
        });

        it('should also be restored when only the outer txn aborts', () => {
            const a$ = new Atom('a');
            const b$ = new Atom('a');
            const c$ = new Atom('a');
            txn(abort => {
                a$.set('set in outer');
                b$.set('set in outer');
                txn(() => {
                    b$.set('set in both');
                    c$.set('set in inner');
                });
                expect(a$._value).toBe('set in outer');
                expect(a$.version).toBe(1);
                expect(b$._value).toBe('set in both');
                expect(b$.version).toBe(2);
                expect(c$._value).toBe('set in inner');
                expect(c$.version).toBe(1);
                abort();
            });
            expect(a$._value).toBe('a');
            expect(a$.version).toBe(0);
            expect(b$._value).toBe('a');
            expect(b$.version).toBe(0);
            expect(c$._value).toBe('a');
            expect(c$.version).toBe(0);
        });

        it('should not be restored on commit', () => {
            const a$ = new Atom('a');
            const b$ = new Atom('a');
            const c$ = new Atom('a');

            txn(() => {
                a$.set('set in outer');
                b$.set('set in outer');
                txn(() => {
                    b$.set('set in both');
                    c$.set('set in inner');
                });
            });
            expect(a$._value).toBe('set in outer');
            expect(b$._value).toBe('set in both');
            expect(c$._value).toBe('set in inner');
        });
    });

    describe('(usecase: derivable promise)', () => {
        jest.useFakeTimers();

        function createDerivablePromise<V>(work: ((resolve: (v: V) => void, reject: (e: any) => void) => void)): Derivable<V> {
            const dp$ = atom.unresolved<V>();
            work(v => dp$.set(v), e => dp$.setError(e));
            return dp$;
        }

        let a$: Derivable<number>;
        let b$: Derivable<number>;
        let c$: Derivable<number>;
        beforeEach(() => {
            a$ = createDerivablePromise(resolve => {
                setTimeout(() => resolve(15), 500);
            });
            b$ = createDerivablePromise(resolve => {
                setTimeout(() => resolve(27), 1000);
            });
            c$ = derive(() => a$.get() + b$.get());
        });

        it('should expose the result asynchronously', () => {
            expect(a$.value).toBeUndefined();
            expect(() => a$.get()).toThrowError();

            jest.advanceTimersByTime(500);
            expect(a$.value).toBe(15);
            expect(a$.get()).toBe(15);
        });

        it('should propagate resolved status', () => {
            expect(c$.resolved).toBe(false);
            jest.advanceTimersByTime(500);
            expect(c$.resolved).toBe(false);
            jest.advanceTimersByTime(500);
            expect(c$.resolved).toBe(true);

            expect(c$.get()).toBe(42);
        });

        it('should propagate error status', async () => {
            const e$ = createDerivablePromise<number>((_, reject) => setTimeout(() => reject(new Error('my error')), 0));
            const f$ = e$.map(v => v + 1);

            const promise = f$.toPromise();

            jest.runOnlyPendingTimers();

            try {
                await promise;
                throw new Error('should have thrown an error');
            } catch (e) {
                expect(e.message).toBe('my error');
            }

            expect(f$.value).toBeUndefined();
            expect(() => f$.get()).toThrowError('my error');
        });

        describe('when used in a reactor', () => {
            it('should only react when all values are available', () => {
                react(c$);

                shouldNotHaveReacted();
                jest.advanceTimersByTime(500);
                shouldNotHaveReacted();
                jest.advanceTimersByTime(500);
                shouldHaveReactedOnce(42);
            });

            it('should switch from unresolved', () => {
                react(derive(() => c$.getOr('unresolved')));

                shouldHaveReactedOnce('unresolved');
                jest.advanceTimersByTime(500);
                shouldNotHaveReacted();
                jest.advanceTimersByTime(500);
                shouldHaveReactedOnce(42);
            });
        });
    });
});
