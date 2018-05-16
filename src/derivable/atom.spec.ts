import { expect } from 'chai';
import { Seq } from 'immutable';
import { spy } from 'sinon';
import { txn } from '../transaction/transaction.spec';
import { atom } from './atom';
import { testDerivable } from './derivable.spec';

describe('derivable/atom', () => {
    testDerivable(atom);

    describe('#set', () => {
        it('should change the current state and version', () => {
            const a$ = atom('a');
            expect(a$.get()).to.equal('a');
            expect(a$.version).to.equal(0);

            a$.set('b');
            expect(a$.get()).to.equal('b');
            expect(a$.version).to.equal(1);
        });

        it('should not update the version if the new value equals the previous value', () => {
            const a$ = atom('a');
            expect(a$.get()).to.equal('a');
            expect(a$.version).to.equal(0);
            a$.set('a');
            expect(a$.get()).to.equal('a');
            expect(a$.version).to.equal(0);

            // Using the utils.equals function
            const imm$ = atom(Seq.Indexed.of(1, 2, 3));
            expect(imm$.get()).to.equal(Seq.of(1, 2, 3));
            expect(imm$.version).to.equal(0);
            imm$.set(Seq.of(1, 2).concat(3).toIndexedSeq());
            expect(imm$.get()).to.equal(Seq.of(1, 2, 3));
            expect(imm$.version).to.equal(0);
            imm$.set(Seq.of(1, 2));
            expect(imm$.get()).to.equal(Seq.of(1, 2));
            expect(imm$.version).to.equal(1);
        });
    });

    describe('#value', () => {
        it('should call #get() when getting the #value property', () => {
            const a$ = atom('a');
            const s = spy(a$, 'get');

            // Use the getter
            expect(a$.value).to.equal('a');

            expect(s).to.have.been.calledOnce;
        });

        it('should call #set() when setting the #value property', () => {
            const a$ = atom('a');
            const s = spy(a$, 'set');

            a$.value = 'b';

            expect(s).to.have.been.calledOnce.and.calledWithExactly('b');
        });
    });

    describe('#swap', () => {
        it('should invoke the swap function with the current value and delegate the work to #set', () => {
            const a$ = atom('a');
            spy(a$, 'set');

            a$.swap(a => a + '!');
            expect(a$.set).to.have.been.calledOnce
                .and.to.have.been.calledWithExactly('a!');
            expect(a$.get()).to.equal('a!');
        });

        it('should pass any additional parameters to the swap function', () => {
            const a$ = atom('a');
            function add(a: string, b: string) { return a + b; }
            a$.swap(add, '!');
            expect(a$.get()).to.equal('a!');
        });
    });

    context('in transactions', () => {
        it('should be restored on abort', () => {
            const a$ = atom('a');
            expect(a$._value).to.equal('a');
            expect(a$.version).to.equal(0);
            txn(abortOuter => {
                a$.set('b');
                expect(a$._value).to.equal('b');
                expect(a$.version).to.equal(1);
                txn(abortInner => {
                    a$.set('c');
                    expect(a$._value).to.equal('c');
                    expect(a$.version).to.equal(2);
                    abortInner();
                });
                expect(a$._value).to.equal('b');
                expect(a$.version).to.equal(1);
                abortOuter();
            });
            expect(a$._value).to.equal('a');
            expect(a$.version).to.equal(0);
        });

        it('should also be restored when only the outer txn aborts', () => {
            const a$ = atom('a');
            const b$ = atom('a');
            const c$ = atom('a');
            txn(abort => {
                a$.set('set in outer');
                b$.set('set in outer');
                txn(() => {
                    b$.set('set in both');
                    c$.set('set in inner');
                });
                expect(a$._value).to.equal('set in outer');
                expect(a$.version).to.equal(1);
                expect(b$._value).to.equal('set in both');
                expect(b$.version).to.equal(2);
                expect(c$._value).to.equal('set in inner');
                expect(c$.version).to.equal(1);
                abort();
            });
            expect(a$._value).to.equal('a');
            expect(a$.version).to.equal(0);
            expect(b$._value).to.equal('a');
            expect(b$.version).to.equal(0);
            expect(c$._value).to.equal('a');
            expect(c$.version).to.equal(0);
        });

        it('should not be restored on commit', () => {
            const a$ = atom('a');
            const b$ = atom('a');
            const c$ = atom('a');

            txn(() => {
                a$.set('set in outer');
                b$.set('set in outer');
                txn(() => {
                    b$.set('set in both');
                    c$.set('set in inner');
                });
            });
            expect(a$._value).to.equal('set in outer');
            expect(b$._value).to.equal('set in both');
            expect(c$._value).to.equal('set in inner');
        });
    });
});
