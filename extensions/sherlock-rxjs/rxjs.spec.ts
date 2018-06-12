import { atom, lift, SettableDerivable } from '@politie/sherlock';
import { expect } from 'chai';
import './rxjs';

describe('rxjs/rxjs', () => {
    describe('Derivable#toObservable', () => {
        let a$: SettableDerivable<string>;

        beforeEach('create the atom', () => { a$ = atom('a'); });

        it('should complete the Observable when until becomes true', () => {
            const until = lift((s: string) => s.length > 2);
            let complete = false;
            let value = '';
            a$.toObservable({ until }).subscribe(v => value = v, undefined, () => complete = true);
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
});
