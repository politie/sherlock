import { atom, SettableDerivable } from '@politie/sherlock';
import { expect } from 'chai';
import { Subject } from 'rxjs';
import { fromObservable } from './rxjs';

describe('rxjs/rxjs', () => {
    describe('Derivable#toObservable', () => {
        let a$: SettableDerivable<string>;

        beforeEach('create the atom', () => { a$ = atom('a'); });

        it('should complete the Observable when until becomes true', () => {
            let complete = false;
            let value = '';
            a$.toObservable({ until: d$ => d$.get().length > 2 }).subscribe(v => value = v, undefined, () => complete = true);
            expect(complete).to.be.false;
            expect(value).to.equal('a');

            a$.set('aa');
            expect(complete).to.be.false;
            expect(value).to.equal('aa');

            a$.set('aaa');
            expect(complete).to.be.true;
            expect(value).to.equal('aa');
        });

        it('should complete the Observable after one value when once is true', () => {
            let complete = false;
            const values: string[] = [];
            a$.toObservable({ once: true }).subscribe(v => values.push(v), undefined, () => complete = true);
            expect(complete).to.be.true;
            expect(values).to.deep.equal(['a']);

            a$.set('b');
            expect(values).to.deep.equal(['a']);
        });

        it('should skip the first value if skipFirst is true', () => {
            let complete = false;
            const values: string[] = [];
            a$.toObservable({ skipFirst: true, once: true }).subscribe(v => values.push(v), undefined, () => complete = true);
            expect(complete).to.be.false;
            expect(values).to.be.empty;

            a$.set('b');
            expect(complete).to.be.true;
            expect(values).to.deep.equal(['b']);

            a$.set('c');
            expect(complete).to.be.true;
            expect(values).to.deep.equal(['b']);
        });

        it('should stop the internal reactor when the Observable is unobserved', () => {
            const sub = a$.toObservable().subscribe();
            expect((a$ as any).observers).not.to.be.empty;
            sub.unsubscribe();
            expect((a$ as any).observers).to.be.empty;
        });

        it('should support multiple subscriptions to the returned Observable', () => {
            const values1: string[] = [];
            const values2: string[] = [];
            const obs = a$.toObservable();
            const sub1 = obs.subscribe(v => values1.push(v));
            const sub2 = obs.subscribe(v => values2.push(v));

            expect(values1).to.deep.equal(['a']);
            expect(values2).to.deep.equal(['a']);

            a$.set('b');

            expect(values1).to.deep.equal(['a', 'b']);
            expect(values2).to.deep.equal(['a', 'b']);

            sub1.unsubscribe();

            a$.set('c');

            expect(values1).to.deep.equal(['a', 'b']);
            expect(values2).to.deep.equal(['a', 'b', 'c']);

            sub2.unsubscribe();
        });

        it('should not complete on unsubscribe', () => {
            let complete = false;
            a$.toObservable().subscribe(undefined, undefined, () => complete = true).unsubscribe();
            expect(complete).to.be.false;
        });
    });

    describe('fromObservable', () => {
        it('should be unresolved when not connected and no fallback is given', () => {
            const subj = new Subject<string>();
            const d$ = fromObservable(subj);

            expect(d$.resolved).to.be.false;

            d$.react(() => 0, { skipFirst: true, once: true });

            expect(d$.resolved).to.be.false;

            subj.next('first value');

            expect(d$.resolved).to.be.true;

            subj.next('this stops the reactor');

            expect(d$.resolved).to.be.false;
        });

        it('should subscribe on observable when used to power a reactor', () => {
            const subj = new Subject<string>();
            const d$ = fromObservable(subj);

            expect(subj.observers).to.be.empty;

            let value: string | undefined;
            let reactions = 0;
            const done = d$.react(v => (++reactions, value = v));

            expect(subj.observers).to.have.length(1);
            expect(reactions).to.equal(0);

            subj.next('value');

            expect(reactions).to.equal(1);
            expect(value).to.equal('value');
            expect(d$.get()).to.equal('value');

            done();

            expect(subj.observers).to.be.empty;
            expect(reactions).to.equal(1);
            expect(d$.resolved).to.be.false;
        });

        it('should disconnect when not directly used in a derivation', () => {
            const subj = new Subject<string>();
            const obs$ = fromObservable(subj);
            const useIt$ = atom(false);
            const derivation$ = useIt$.derive(v => v && obs$.get());

            let value: string | boolean | undefined;
            let reactions = 0;
            derivation$.react(v => (++reactions, value = v));

            expect(subj.observers).to.be.empty;
            expect(reactions).to.equal(1);
            expect(value).to.equal(false);

            useIt$.set(true);

            expect(subj.observers).to.have.length(1);
            expect(reactions).to.equal(1);
            expect(value).to.equal(false);

            subj.next('value');

            expect(reactions).to.equal(2);
            expect(value).to.equal('value');

            useIt$.set(false);

            expect(subj.observers).to.be.empty;
            expect(reactions).to.equal(3);
            expect(value).to.equal(false);
        });

        it('should use the fallback when given and not connected', () => {
            const subj = new Subject<string>();
            const f$ = atom('fallback');
            const d$ = fromObservable(subj, f$);
            expect(d$.get()).to.equal('fallback');
            expect(subj.observers).to.be.empty;

            let value: string | undefined;
            let reactions = 0;
            const done = d$.react(v => (++reactions, value = v));

            expect(subj.observers).to.have.length(1);
            expect(reactions).to.equal(1);
            expect(value).to.equal('fallback');

            subj.next('value');

            expect(reactions).to.equal(2);
            expect(value).to.equal('value');
            expect(d$.get()).to.equal('value');

            done();

            expect(subj.observers).to.be.empty;
            expect(reactions).to.equal(2);
            expect(d$.get()).to.equal('fallback');
        });

        it('should propagate errors', () => {
            const subj = new Subject<string>();
            const d$ = fromObservable(subj);

            d$.autoCache();

            expect(subj.observers).to.be.empty;
            expect(d$.resolved).to.be.false;
            expect(subj.observers).to.have.length(1);

            subj.next('a value');

            expect(d$.get()).to.equal('a value');

            subj.error(new Error('my error message'));

            expect(() => d$.get()).to.throw('my error message');
        });

        it('should support toPromise', async () => {
            const subj = new Subject<string>();
            const d$ = fromObservable(subj);

            setTimeout(() => subj.next('value'), 0);

            expect(await d$.toPromise()).to.equal('value');

            setTimeout(() => subj.error(new Error('my error')), 0);

            try {
                await d$.toPromise();
                throw new Error('should have thrown an error');
            } catch (e) {
                expect(e.message).to.equal('my error');
            }
        });
    });
});
