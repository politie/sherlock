import { expect } from 'chai';
import { Seq } from 'immutable';
import { txn } from '../transaction/transaction.spec';
import { Atom } from './atom';
import { testDerivable } from './derivable.spec';
import { atom } from './factories';
import { testSwap } from './mixins/swap.spec';

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

    testSwap(atom);

    context('in transactions', () => {
        it('should be restored on abort', () => {
            const a$ = atom('a') as Atom<string>;
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
            const a$ = atom('a') as Atom<string>;
            const b$ = atom('a') as Atom<string>;
            const c$ = atom('a') as Atom<string>;
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
            const a$ = atom('a') as Atom<string>;
            const b$ = atom('a') as Atom<string>;
            const c$ = atom('a') as Atom<string>;

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
