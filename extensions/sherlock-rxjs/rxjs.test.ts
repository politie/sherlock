import { _internal, atom, DerivableAtom } from '@politie/sherlock';
import { defer, Subject } from 'rxjs';
import { fromObservable, toObservable } from './rxjs';

describe('rxjs/rxjs', () => {
    describe('toObservable', () => {
        let a$: DerivableAtom<string>;

        beforeEach(() => { a$ = atom('a'); });

        it('should complete the Observable immediately when the derivable is already final', () => {
            a$.setFinal('final value');
            let value = '';
            let complete = false;
            toObservable(a$).subscribe(v => value = v, undefined, () => complete = true);
            expect(value).toBe('final value');
            expect(complete).toBeTrue();
        });

        it('should complete the Observable when the derivable becomes final', () => {
            let value = '';
            let complete = false;
            toObservable(a$).subscribe(v => value = v, undefined, () => complete = true);
            expect(value).toBe('a');
            expect(complete).toBeFalse();

            a$.setFinal('b');
            expect(value).toBe('b');
            expect(complete).toBeTrue();
        });

        it('should complete the Observable when until becomes true', () => {
            let complete = false;
            let value = '';
            toObservable(a$, { until: d$ => d$.get().length > 2 }).subscribe(v => value = v, undefined, () => complete = true);
            expect(complete).toBe(false);
            expect(value).toBe('a');

            a$.set('aa');
            expect(complete).toBe(false);
            expect(value).toBe('aa');

            a$.set('aaa');
            expect(complete).toBe(true);
            expect(value).toBe('aa');
        });

        it('should complete the Observable after one value when once is true', () => {
            let complete = false;
            const values: string[] = [];
            toObservable(a$, { once: true }).subscribe(v => values.push(v), undefined, () => complete = true);
            expect(complete).toBe(true);
            expect(values).toEqual(['a']);

            a$.set('b');
            expect(values).toEqual(['a']);
        });

        it('should skip the first value if skipFirst is true', () => {
            let complete = false;
            const values: string[] = [];
            toObservable(a$, { skipFirst: true, once: true }).subscribe(v => values.push(v), undefined, () => complete = true);
            expect(complete).toBe(false);
            expect(Object.keys(values)).toHaveLength(0);

            a$.set('b');
            expect(complete).toBe(true);
            expect(values).toEqual(['b']);

            a$.set('c');
            expect(complete).toBe(true);
            expect(values).toEqual(['b']);
        });

        it('should stop the internal reactor when the Observable is unobserved', () => {
            const sub = toObservable(a$).subscribe();
            expect(a$[_internal.symbols.observers]).not.toBeEmpty();
            sub.unsubscribe();
            expect(a$[_internal.symbols.observers]).toBeEmpty();
        });

        it('should support multiple subscriptions to the returned Observable', () => {
            const values1: string[] = [];
            const values2: string[] = [];
            const obs = toObservable(a$);
            const sub1 = obs.subscribe(v => values1.push(v));
            const sub2 = obs.subscribe(v => values2.push(v));

            expect(values1).toEqual(['a']);
            expect(values2).toEqual(['a']);

            a$.set('b');

            expect(values1).toEqual(['a', 'b']);
            expect(values2).toEqual(['a', 'b']);

            sub1.unsubscribe();

            a$.set('c');

            expect(values1).toEqual(['a', 'b']);
            expect(values2).toEqual(['a', 'b', 'c']);

            sub2.unsubscribe();
        });

        it('should not complete on unsubscribe', () => {
            let complete = false;
            toObservable(a$).subscribe(undefined, undefined, () => complete = true).unsubscribe();
            expect(complete).toBe(false);
        });
    });

    describe('fromObservable', () => {
        it('should be unresolved when not connected or when no value has been emitted yet', () => {
            const subj = new Subject<string>();
            const d$ = fromObservable(subj);

            expect(d$.resolved).toBe(false);

            d$.react(() => 0, { skipFirst: true, once: true });

            expect(d$.resolved).toBe(false);

            subj.next('first value');

            expect(d$.resolved).toBe(true);

            subj.next('this stops the reactor');

            expect(d$.resolved).toBe(false);
        });

        it('should subscribe to observable when used to power a reactor', () => {
            const subj = new Subject<string>();
            const d$ = fromObservable(subj);

            expect(subj.observers).toHaveLength(0);

            let value: string | undefined;
            let reactions = 0;
            const done = d$.react(v => (++reactions, value = v));

            expect(subj.observers).toHaveLength(1);
            expect(reactions).toBe(0);

            subj.next('value');

            expect(reactions).toBe(1);
            expect(value).toBe('value');
            expect(d$.get()).toBe('value');

            done();

            expect(subj.observers).toHaveLength(0);
            expect(reactions).toBe(1);
            expect(d$.resolved).toBe(false);
        });

        it('should subscribe to the observable only once with multiple reactors', () => {
            const subj = new Subject<string>();
            const d$ = fromObservable(subj);

            let reactions = 0;
            const done1 = d$.react(() => ++reactions);
            const done2 = d$.react(() => ++reactions);

            expect(subj.observers).toHaveLength(1);

            subj.next('a value');

            expect(reactions).toBe(2);

            done1();
            expect(subj.observers).toHaveLength(1);
            done2();
            expect(subj.observers).toHaveLength(0);
        });

        it('should disconnect when not directly used in a derivation', () => {
            const subj = new Subject<string>();
            const obs$ = fromObservable(subj);
            const useIt$ = atom(false);
            const derivation$ = useIt$.derive(v => v && obs$.get());

            let value: string | boolean | undefined;
            let reactions = 0;
            derivation$.react(v => (++reactions, value = v));

            expect(subj.observers).toHaveLength(0);
            expect(reactions).toBe(1);
            expect(value).toBe(false);

            useIt$.set(true);

            expect(subj.observers).toHaveLength(1);
            expect(reactions).toBe(1);
            expect(value).toBe(false);

            subj.next('value');

            expect(reactions).toBe(2);
            expect(value).toBe('value');

            useIt$.set(false);

            expect(subj.observers).toHaveLength(0);
            expect(reactions).toBe(3);
            expect(value).toBe(false);
        });

        it('should work with a fallback when given and not connected', () => {
            const subj = new Subject<string>();
            const f$ = atom('fallback');
            const d$ = fromObservable(subj).fallbackTo(f$);
            expect(d$.get()).toBe('fallback');
            expect(subj.observers).toHaveLength(0);

            let value: string | undefined;
            let reactions = 0;
            const done = d$.react(v => (++reactions, value = v));

            expect(subj.observers).toHaveLength(1);
            expect(reactions).toBe(1);
            expect(value).toBe('fallback');

            subj.next('value');

            expect(reactions).toBe(2);
            expect(value).toBe('value');
            expect(d$.get()).toBe('value');

            done();

            expect(subj.observers).toHaveLength(0);
            expect(reactions).toBe(2);
            expect(d$.get()).toBe('fallback');
        });

        it('should propagate errors', () => {
            const subj = new Subject<string>();
            const d$ = fromObservable(subj);

            d$.autoCache();

            expect(subj.observers).toHaveLength(0);
            expect(d$.resolved).toBe(false);
            expect(subj.observers).toHaveLength(1);

            subj.next('a value');

            expect(d$.get()).toBe('a value');

            subj.error(new Error('my error message'));

            expect(() => d$.get()).toThrowError('my error message');
        });

        it('should support toPromise', async () => {
            const subj = new Subject<string>();
            const d$ = fromObservable(subj);

            setTimeout(() => subj.next('value'), 0);

            expect(await d$.toPromise()).toBe('value');

            setTimeout(() => subj.error(new Error('my error')), 0);

            try {
                await d$.toPromise();
                throw new Error('should have thrown an error');
            } catch (e) {
                expect(e.message).toBe('my error');
            }
        });

        it('should reconnect after a disconnect, allowing to continue after a completed Observable', () => {
            let connections = 0;
            let subj: Subject<string> = 0 as any;
            const obs = defer(() => (++connections, subj = new Subject<string>()));
            const when = atom(true);
            const d$ = fromObservable(obs);

            expect(connections).toBe(0);

            let value = '';
            d$.react(v => value = v, { when });

            expect(connections).toBe(1);
            expect(value).toBe('');

            subj.next('a');
            expect(value).toBe('a');

            subj.complete();

            subj.next('b');
            expect(value).toBe('a');

            expect(connections).toBe(1);
            when.set(false);
            when.set(true);
            expect(connections).toBe(2);

            subj.next('b');
            expect(value).toBe('b');
        });
    });
});
