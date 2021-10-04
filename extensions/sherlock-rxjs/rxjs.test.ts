import { _internal, atom, DerivableAtom } from '@politie/sherlock';
import 'expect-more-jest';
import { defer, of, Subject } from 'rxjs';
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
            expect(a$[_internal.symbols.observers]).not.toBeEmptyArray();
            sub.unsubscribe();
            expect(a$[_internal.symbols.observers]).toBeEmptyArray();
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
        it('should be unresolved until connected and the first value has been emitted', () => {
            const subj = new Subject<string>();
            const d$ = fromObservable(subj);

            expect(d$.resolved).toBe(false);
            let value = '';
            d$.react(v => value = v, { skipFirst: true, once: true });

            expect(d$.resolved).toBe(false);

            subj.next('first value');

            expect(d$.resolved).toBe(true);
            expect(value).toBe('');

            subj.next('this stops the reactor');

            expect(d$.value).toBe('this stops the reactor');
            expect(value).toBe('this stops the reactor');

            subj.next('this is ignored');

            expect(d$.value).toBe('this stops the reactor');
            expect(value).toBe('this stops the reactor');
        });

        it('should subscribe to observable when used to power a reactor', () => {
            const subj = new Subject<string>();
            const d$ = fromObservable(subj);

            expect(subj.observers).toHaveLength(0);

            let value: string | undefined;
            let reactions = 0;
            let done = d$.react(v => (++reactions, value = v));

            expect(subj.observers).toHaveLength(1);
            expect(reactions).toBe(0);

            subj.next('value');

            expect(reactions).toBe(1);
            expect(value).toBe('value');
            expect(d$.get()).toBe('value');

            done();

            expect(subj.observers).toHaveLength(0);
            expect(reactions).toBe(1);
            expect(d$.get()).toBe('value');

            subj.next('another value');

            expect(subj.observers).toHaveLength(0);
            expect(reactions).toBe(1);
            expect(d$.get()).toBe('value');

            done = d$.react(v => (++reactions, value = v));

            expect(subj.observers).toHaveLength(1);
            expect(reactions).toBe(2);
            expect(d$.get()).toBe('value');

            subj.next('yet another value');

            expect(subj.observers).toHaveLength(1);
            expect(reactions).toBe(3);
            expect(d$.get()).toBe('yet another value');

            done();

            expect(subj.observers).toHaveLength(0);
            expect(reactions).toBe(3);
            expect(d$.get()).toBe('yet another value');
        });

        it('should disconnect and finalize when the observable completes', () => {
            const subj = new Subject<string>();
            let connections = 0;
            const d$ = fromObservable(defer(() => (++connections, subj)));

            expect(connections).toBe(0);

            let value = '';
            d$.react(v => value = v);
            expect(connections).toBe(1);

            subj.next('value');
            expect(value).toBe('value');
            expect(d$.connected).toBeTrue();
            expect(d$.final).toBeFalse();

            subj.complete();
            expect(value).toBe('value');
            expect(d$.value).toBe('value');
            expect(d$.connected).toBeFalse();
            expect(d$.final).toBeTrue();

            // Should never connect again.
            d$.react(() => 0);
            expect(connections).toBe(1);
        });

        it('should disconnect and finalize when the observable errors', () => {
            const subj = new Subject<string>();
            const d$ = fromObservable(subj);

            let error = '';
            d$.react(() => 0, { onError: e => error = e });

            expect(subj.observers.length).toBe(1);

            subj.next('value');
            expect(d$.connected).toBeTrue();
            expect(d$.final).toBeFalse();

            subj.error('oh no!');
            expect(error).toBe('oh no!');
            expect(d$.error).toBe('oh no!');
            expect(d$.connected).toBeFalse();
            expect(d$.final).toBeTrue();

            // Should never connect again.
            d$.react(() => 0, { onError: () => 0 });
            expect(subj.observers.length).toBe(0);
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
            expect(d$.get()).toBe('value');
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

            // Reusing the same will return the last known value.
            expect(await d$.toPromise()).toBe('value');
            try {
                await fromObservable(subj).toPromise();
                throw new Error('should have thrown an error');
            } catch (e: any) {
                expect(e.message).toBe('my error');
            }
        });

        it('should support scalar observables', () => {
            const obs = of(1);
            const d$ = fromObservable(obs);
            expect(d$.value).toBe(undefined);
            expect(d$.autoCache().value).toBe(1);
        });
    });
});
