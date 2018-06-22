import { expect } from 'chai';
import { Seq } from 'immutable';
import { restorableState, unresolved } from '../symbols';
import { txn } from '../transaction/transaction.spec';
import { ErrorWrapper } from '../utils';
import { Atom } from './atom';
import { $, testDerivable } from './base-derivable.spec';
import { atom } from './factories';
import { testSwap } from './mixins/swap.spec';

describe('derivable/atom', () => {
    testDerivable(v => v === unresolved ? atom.unresolved() : v instanceof ErrorWrapper ? atom.error(v.error) : atom(v), false);
    testSwap(atom);

    describe('#set', () => {
        it('should change the current state and version', () => {
            const a$ = $(atom('a'));
            expect(a$.get()).to.equal('a');
            expect(a$.version).to.equal(0);

            a$.set('b');
            expect(a$.get()).to.equal('b');
            expect(a$.version).to.equal(1);
        });

        it('should not update the version if the new value equals the previous value', () => {
            const a$ = $(atom('a'));
            expect(a$.get()).to.equal('a');
            expect(a$.version).to.equal(0);
            a$.set('a');
            expect(a$.get()).to.equal('a');
            expect(a$.version).to.equal(0);

            // Using the utils.equals function
            const imm$ = $(atom(Seq.Indexed.of(1, 2, 3)));
            expect(imm$.get()).to.equal(Seq.of(1, 2, 3));
            expect(imm$.version).to.equal(0);
            imm$.set(Seq.of(1, 2).concat(3).toIndexedSeq());
            expect(imm$.get()).to.equal(Seq.of(1, 2, 3));
            expect(imm$.version).to.equal(0);
            imm$.set(Seq.of(1, 2));
            expect(imm$.get()).to.equal(Seq.of(1, 2));
            expect(imm$.version).to.equal(1);
        });

        it('should reset the unresolved status', () => {
            const a$ = atom.unresolved<string>();
            expect(a$.resolved).to.be.false;
            a$.set('value');
            expect(a$.resolved).to.be.true;
        });
    });

    describe('#unset', () => {
        let a$: Atom<string>;
        beforeEach('create the atom', () => { a$ = new Atom('a'); });

        it('should be able to `unset`', () => {
            expect(a$.get()).to.equal('a');
            a$.unset();
            expect(() => a$.get()).to.throw();
        });

        it('should be possible to re`set` an `unset` atom', () => {
            a$.unset();
            a$.set('b');
            expect(a$.get()).to.equal('b');
        });
    });

    describe('#setError', () => {
        let a$: Atom<string>;
        beforeEach('create the atom', () => { a$ = new Atom('a'); });

        it('should be able to change the state to errored', () => {
            expect(a$.get()).to.equal('a');
            a$.setError(new Error('my error'));
            expect(() => a$.get()).to.throw('my error');
        });

        it('should be possible to revert an errored atom to normal', () => {
            a$.setError(new Error('my error'));
            a$.set('a normal value');
            expect(a$.get()).to.equal('a normal value');
        });
    });

    context('in transactions', () => {
        it('should be restored on abort', () => {
            const a$ = new Atom('a');
            expect(a$[restorableState]).to.equal('a');
            expect(a$.version).to.equal(0);
            txn(abortOuter => {
                a$.set('b');
                expect(a$[restorableState]).to.equal('b');
                expect(a$.version).to.equal(1);
                txn(abortInner => {
                    a$.set('c');
                    expect(a$[restorableState]).to.equal('c');
                    expect(a$.version).to.equal(2);
                    abortInner();
                });
                expect(a$[restorableState]).to.equal('b');
                expect(a$.version).to.equal(1);
                abortOuter();
            });
            expect(a$[restorableState]).to.equal('a');
            expect(a$.version).to.equal(0);
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
                expect(a$[restorableState]).to.equal('set in outer');
                expect(a$.version).to.equal(1);
                expect(b$[restorableState]).to.equal('set in both');
                expect(b$.version).to.equal(2);
                expect(c$[restorableState]).to.equal('set in inner');
                expect(c$.version).to.equal(1);
                abort();
            });
            expect(a$[restorableState]).to.equal('a');
            expect(a$.version).to.equal(0);
            expect(b$[restorableState]).to.equal('a');
            expect(b$.version).to.equal(0);
            expect(c$[restorableState]).to.equal('a');
            expect(c$.version).to.equal(0);
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
            expect(a$[restorableState]).to.equal('set in outer');
            expect(b$[restorableState]).to.equal('set in both');
            expect(c$[restorableState]).to.equal('set in inner');
        });
    });
});
