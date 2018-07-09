import { atom, constant, Derivable, DerivableAtom, derive, unwrap } from '@politie/sherlock';
import { expect } from 'chai';
import * as immutable from 'immutable';
import { SinonSpy, spy } from 'sinon';
import { derivableCache, DerivableCache, MapImplementation } from './derivable-cache';
import { template } from './template';

describe('sherlock-utils/derivableCache', () => {
    it('should support constants as output of the derivable factory', () => {
        const derivableFactory = spy(constant);
        const identityCache = derivableCache<number, number>({ derivableFactory });
        derive(() => identityCache(1).get() + identityCache(2).get()).react(() => 0);
        expect(derivableFactory).to.have.been.calledTwice;
        identityCache(1).get();
        identityCache(2).get();
        expect(derivableFactory).to.have.been.calledTwice;
    });

    it('should support derivables as input to the cache', () => {
        const derivableFactory = spy((v: string) => constant(v + v));
        const repeated = derivableCache<string, string>({ derivableFactory });
        const input$ = atom('abc');
        const output$ = repeated(input$);
        let output = '';
        output$.react(v => output = v);

        expect(derivableFactory).to.have.been.calledOnce
            .and.to.have.been.calledWithExactly('abc');
        expect(output).to.equal('abcabc');

        input$.set('def');

        expect(derivableFactory).to.have.been.calledTwice
            .and.to.have.been.calledWithExactly('def');
        expect(output).to.equal('defdef');
    });

    it('should reuse proxies as much as possible', () => {
        const cache = derivableCache<string, string>({ derivableFactory: constant });
        const proxy1 = cache('abc');
        const proxy2 = cache('abc');

        // Cannot remember proxies without connection, because we don't know when to evict them.
        expect(proxy2).to.not.equal(proxy1);

        proxy1.autoCache().get();

        // But when connected we can automatically reuse proxies when using simple keys.
        expect(cache('abc')).to.equal(proxy1);

        // Not possible when using derivables as input of course
        expect(cache(constant('abc'))).to.not.equal(proxy1);
    });

    context('(using the default JavaScript map implementation)', () => {
        let derivableFactory: SinonSpy;
        let resultCache: DerivableCache<string, string>;

        beforeEach('setup cachedFactory', () => {
            derivableFactory = spy((k: string) => constant('result from ' + k));
            resultCache = derivableCache({ derivableFactory });
        });

        it('should do no special tricks when not connected', () => {
            const d1 = resultCache('key1');
            const d2 = resultCache('key1');
            d1.get();
            expect(derivableFactory).to.have.been.calledOnce;
            d1.get();
            d2.get();
            expect(derivableFactory).to.have.been.calledThrice;
            expect(derivableFactory.getCall(0).args).to.deep.equal(['key1']);
            expect(derivableFactory.getCall(1).args).to.deep.equal(['key1']);
            expect(derivableFactory.getCall(2).args).to.deep.equal(['key1']);
        });

        it('should error when trying to set the proxy when the source derivable is not settable', () => {
            expect(() => resultCache('foo').set('bar')).to.throw('Cached derivable is not settable');
        });

        it('should return a settable derivable when the derivable returns settable derivables', done => {
            const mutableCache = derivableCache<string, string>({ derivableFactory: atom, delayedEviction: true });
            const sd1$ = mutableCache('abc');
            const sd2$ = mutableCache('abc');
            sd1$.swap(s => s + '!!!');
            expect(sd2$.value).to.equal('abc!!!');

            setTimeout(() => {
                // This change is lost, cause our atom doesn't write back to a more persistent store.
                sd2$.set('whatever');
                expect(sd2$.value).to.equal('abc');
                done();
            }, 0);
        });

        context('(when connected)', () => {
            let input$: DerivableAtom<string[]>;
            let output$: Derivable<string[]>;
            let stopConnection: () => void;
            beforeEach('setup derivables', () => {
                input$ = atom(['key1', 'key2']);
                output$ = input$.derive(keys => keys.map(resultCache).map(unwrap));
                stopConnection = output$.react(() => 0);

                expect(derivableFactory).to.have.been.calledTwice;
                derivableFactory.resetHistory();
                expect(output$.value).to.deep.equal([
                    'result from key1',
                    'result from key2',
                ]);
            });

            it('should reuse derivations by key as long as they are connected', () => {
                // These are cached, because they are used in the connected output$:
                resultCache('key1').get();
                resultCache('key2').get();
                expect(derivableFactory).to.not.have.been.called;

                // This one is not cached, because it is not used anywhere:
                resultCache('key3').get();
                expect(derivableFactory).to.have.been.calledOnce;
                resultCache('key3').get();
                expect(derivableFactory).to.have.been.calledTwice;

                stopConnection();

                // Now nothing is cached, cause the connection is stopped.

                derivableFactory.resetHistory();
                resultCache('key1').get();
                resultCache('key2').get();
                resultCache('key3').get();
                expect(derivableFactory).to.have.been.calledThrice;

                derivableFactory.resetHistory();
                resultCache('key1').get();
                resultCache('key1').get();
                expect(derivableFactory).to.have.been.calledTwice;
            });

            it('should create derivations when needed', () => {
                input$.swap(a => a.concat('key3', 'key3', 'key2'));
                expect(derivableFactory).to.have.been.calledOnce
                    .and.to.have.been.calledWithExactly('key3');

                expect(output$.value).to.deep.equal([
                    'result from key1',
                    'result from key2',
                    'result from key3',
                    'result from key3',
                    'result from key2',
                ]);
            });

            it('should forget derivations when no longer used', () => {
                input$.swap(a => a.slice(0, 1));
                expect(derivableFactory).to.not.have.been.called;

                expect(output$.value).to.deep.equal([
                    'result from key1',
                ]);

                input$.swap(a => a.concat('key2'));

                expect(derivableFactory).to.have.been.calledOnce
                    .and.to.have.been.calledWithExactly('key2');

                expect(output$.value).to.deep.equal([
                    'result from key1',
                    'result from key2',
                ]);
            });
        });
    });

    context('(usecase: async work e.g. HTTP calls using custom map implementation)', () => {
        interface Request { method: string; url: string; }
        interface Response { code: number; body: string; }
        let derivableFactory: SinonSpy;
        let performCall: DerivableCache<Request, Response>;

        beforeEach('setup', () => {
            derivableFactory = spy((key: Request) => {
                const result = atom.unresolved<Response>();
                // Do some hard work (an HTTP call for example).
                fetchItLater();
                return result;

                async function fetchItLater() {
                    await Promise.resolve();
                    result.set({ code: 200, body: `Result from ${key.method} to ${key.url}.` });
                }
            });
            performCall = derivableCache({ derivableFactory, mapFactory: ImmutableMap.factory });
        });

        it('should allow inline construction of derivables without recreating them everytime the derivation is recalculated', async () => {
            const counter$ = atom(0);
            const template$ = template`Counter: ${counter$}. ${performCall({ url: '/home', method: 'GET' }).pluck('body')}`;

            let result = 'Loading...';
            template$.react(v => result = v);

            // Reaction will only happen once everything in the template is resolved (this can be countered by using #fallbackTo)
            expect(result).to.equal('Loading...');

            // This has no effect, cause the call has not resolved yet.
            counter$.set(1);

            expect(result).to.equal('Loading...');

            // Wait until the template is ready (we can do this because template$ is already connected, so no additional work is done here)
            await template$.toPromise();

            // Now we have the full result.
            expect(result).to.equal('Counter: 1. Result from GET to /home.');

            // Even when we recalculate the entire template, the call is not repeated.
            counter$.set(2);
            expect(result).to.equal('Counter: 2. Result from GET to /home.');

            // In the end, the call was only performed once.
            expect(derivableFactory).to.have.been.calledOnce;
        });

        it('should cache only while anyone is connected (with toPromise for example)', async () => {
            const result$ = performCall({ url: '/url', method: 'GET' });

            expect(derivableFactory).to.not.have.been.called;

            const promise = result$.toPromise();

            expect(derivableFactory).to.have.been.calledOnce;

            const otherResult$ = performCall({ url: '/url', method: 'GET' }).autoCache();

            expect(otherResult$.resolved).to.be.false;

            expect(await promise).to.deep.equal({ code: 200, body: 'Result from GET to /url.' });
            expect(otherResult$.value).to.deep.equal({ code: 200, body: 'Result from GET to /url.' });

            expect(derivableFactory).to.have.been.calledOnce;
        });
    });

    context('(with delayedEviction on)', () => {
        it('should keep the cached entry after disconnection until end of tick', done => {
            const derivableFactory = spy(constant);
            const cache = derivableCache<string, string>({ derivableFactory, delayedEviction: true });

            cache('abc').get();
            cache('abc').get();
            cache('abc').get();
            expect(derivableFactory).to.have.been.calledOnce;

            setTimeout(() => {
                cache('abc').get();
                cache('abc').get();
                expect(derivableFactory).to.have.been.calledTwice;
                done();
            }, 0);
        });
    });
});

class ImmutableMap<K, V> implements MapImplementation<K, V> {
    private map = immutable.Map<object, V>();
    set(key: K, value: V) { this.map = this.map.set(immutable.fromJS(key), value); }
    delete(key: K) { this.map = this.map.delete(immutable.fromJS(key)); }
    get(key: K) { return this.map.get(immutable.fromJS(key)); }
    static factory<K, V>() { return new ImmutableMap<K, V>(); }
}
