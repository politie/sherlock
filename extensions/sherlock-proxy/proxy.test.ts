import { atom, constant, Derivable, isDerivable, utils } from '@politie/sherlock';
import { fromJS, Seq } from 'immutable';
import { DerivableProxy, extendExpression, isDerivableProxy, ProxyDescriptor } from './proxy';

typeof Proxy !== 'undefined' && describe('proxy', () => {

    type ProxyType<Structure, Extras = {}> = DerivableProxy<Structure>
        & { [P in keyof Structure]: ProxyType<Structure[P], Extras> }
        & Extras;

    function createForObject<T>(obj: T): ProxyType<T> {
        return new ProxyDescriptor<T>().$create(atom(obj)) as ProxyType<T>;
    }

    describe('ProxyDescriptor', () => {
        it('should create a DerivableProxy, testable with isDerivableProxy', () => {
            const result = createForObject(123);
            expect(isDerivableProxy(result)).toBe(true);
        });

        describe('(plucked properties)', () => {
            it('should pluck on any numbered index access', () => {
                const result = createForObject([1, 2, 3]);
                expect(result[0].$value).toBe(1);
                expect(result[2].$value).toBe(3);
            });

            it('should pluck on any string access that does not start with a $', () => {
                const result = createForObject({ a: 1, b: 2 });
                expect(result.a.$value).toBe(1);
                expect(result.b.$value).toBe(2);
            });

            it('should call #$pluck for each pluck operation', () => {
                const pd = new ProxyDescriptor();
                jest.spyOn(pd, '$pluck');
                const px = pd.$create(atom({ a: { b: 'value' } })) as ProxyType<{ a: { b: string } }>;
                expect(px.a.b.$value).toBe('value');
                expect(pd.$pluck).toHaveBeenCalledTimes(2);
                expect(pd.$pluck).toHaveBeenCalledWith('a');
                expect(pd.$pluck).toHaveBeenCalledWith('b');
            });

            it('should expose the extended expression when plucked', () => {
                const obj = createForObject({}) as any;
                expect(obj.$expression).toBeUndefined();
                expect(obj.prop1.$expression).toBe('.prop1');
                expect(obj.prop1.prop2.$expression).toBe('.prop1.prop2');
                expect(obj.prop1['\''].$expression).toBe('.prop1["\'"]');
                expect(obj.prop1['"'].$expression).toBe('.prop1["\\""]');
                // Unfortunately JavaScript only has string properties, even Array elements are technically accessed by
                // string index.
                expect(obj.prop1[0][1][2].$expression).toBe('.prop1["0"]["1"]["2"]');

                // The $pluck API allows us to use numbers, but that is cumbersome...
                expect(obj.prop.$pluck(1).$expression).toBe('.prop[1]');
            });

            it('should expose the extended path when plucked', () => {
                const obj = createForObject({}) as any;
                expect(obj.$path).toBeUndefined();
                expect(obj.prop1.$path).toEqual(['prop1']);
                expect(obj.prop1.prop2.$path).toEqual(['prop1', 'prop2']);
                expect(obj.prop1[0][1][2].$path).toEqual(['prop1', '0', '1', '2']);

                expect(obj.prop.$pluck(2).$path).toEqual(['prop', 2]);
            });

            it('should be possible to override the default $pluck behavior', () => {
                const pd = new ProxyDescriptor<string>();
                pd.$pluck = function (this: ProxyDescriptor<string>, prop: string | number) {
                    return this.$create(this.$target.map(v => (v + ' ' + prop).trim()), extendExpression(this.$expression, prop));
                };
                const px = pd.$create(constant('')) as any;
                expect(px.this.is.awkward.in.more.than[10].ways.$value).toBe('this is awkward in more than 10 ways');
            });

            it('should allow setting a pluckable property with another DerivableProxy when the target is an atom', () => {
                const lhs = createForObject({ prop: 'value' });
                const rhs = createForObject({ prop: 'other value' });
                lhs.prop = rhs.prop;
                expect(lhs.$value).toEqual({ prop: 'other value' });
            });

            it('should assign to the unlensed $target when assigning another DerivableProxy to a property', () => {
                const pd = new class extends ProxyDescriptor {
                    $lens() {
                        return this.$expression ? { get: (v: string) => v + '!' } : undefined;
                    }
                };
                const lhs = pd.$create(atom({ prop: 'value' })) as any;
                const rhs = pd.$create(atom({ prop: 'other value' })) as any;
                expect(lhs.prop.$value).toBe('value!');
                lhs.prop = rhs.prop;
                expect(lhs.prop.$value).toBe('other value!');
            });

            it('should allow setting a pluckable property with a Derivable when the target is an atom', () => {
                const pd = new class extends ProxyDescriptor {
                    $lens() {
                        const negate = (v: number) => -v;
                        return this.$expression ? { get: negate, set: negate } : undefined;
                    }
                };
                const lhs = pd.$create(atom({ prop: 10 })) as any;
                expect(lhs.prop.$value).toBe(-10);
                const rhs = constant(-20);
                lhs.prop = rhs as any;
                expect(lhs.$value).toEqual({ prop: 20 });
            });

            it('should support reacting to derivables in settable $lens', () => {
                const magic$ = atom(1);
                const pd = new (class extends ProxyDescriptor {
                    $lens() {
                        const addMagic = (v: number) => v + magic$.get();
                        const removeMagic = (v: number) => v - magic$.get();
                        return this.$expression ? { get: addMagic, set: removeMagic } : undefined;
                    }
                });
                const lhs = pd.$create(atom({ prop: 10 })) as any;
                let value = 0;
                const done = lhs.prop.$react((v: number) => value = v);
                expect(value).toBe(11);
                magic$.set(2);
                expect(value).toBe(12);
                lhs.prop.$value = 3;
                expect(lhs.$value).toEqual({ prop: 1 });
                done();
            });

            it('should pass the lens as `this` to the getter and setter', () => {
                const pd = new (class extends ProxyDescriptor {
                    $lens() {
                        return {
                            get(this: Derivable<any>, targetValue: string) {
                                expect(this.connected).toBe(true);
                                return targetValue + '!';
                            },
                            set(this: Derivable<any>, newValue: any, targetValue: string) {
                                expect(this.connected).toBe(true);
                                expect(this.value).toBe(targetValue + '!');
                                return newValue.slice(0, -1);
                            }
                        };
                    }
                });
                const a$ = atom('first value');
                const px = pd.$create(a$);
                expect(px.$value).toBe('first value!');
                px.$value = 'other value!';
                expect(a$.value).toBe('other value');
            });

            it('should allow setting a pluckable property with an ordinary value when the target is an atom', () => {
                const pd = new class extends ProxyDescriptor {
                    $lens() {
                        const negate = (v: number) => -v;
                        return this.$expression ? { get: negate, set: negate } : undefined;
                    }
                };
                const lhs = pd.$create(atom({ prop: 10 })) as any;
                expect(lhs.prop.$value).toBe(-10);
                lhs.prop = -20 as any;
                expect(lhs.$value).toEqual({ prop: 20 });
            });

            it('should allow setting a numbered index on a DerivableProxy of array', () => {
                const lhs = createForObject([1, 0, 3]);
                expect(lhs.length).toBe(3);
                lhs[1].$value = 2;
                lhs[3].$value = 4;
                expect(lhs.length).toBe(4);
                expect(lhs.$value).toEqual([1, 2, 3, 4]);
            });

            it('should also work using PropertyDescriptor', () => {
                const obj = createForObject({ prop: 'value' });
                const desc = Object.getOwnPropertyDescriptor(obj, 'prop')!;
                expect(desc.get!.call(obj).$value).toBe('value');
                desc.set!.call(obj, 'new value');
                expect(obj.prop.$value).toBe('new value');
            });
        });

        it('should be compatible with Sherlock equals method', () => {
            const sourceA = atom(1234);
            const sourceB = atom(1234);
            const descriptor = new ProxyDescriptor();
            const pdA = descriptor.$create(sourceA);
            const pdB = descriptor.$create(sourceB);

            expect(utils.equals(pdA, pdA)).toBe(true);
            expect(utils.equals(pdB, pdB)).toBe(true);

            expect(utils.equals(pdA, pdB)).toBe(false);
        });

        it('should not apply any transformation by default', () => {
            const a$ = atom('abc');
            const px = new ProxyDescriptor().$create(a$);
            expect(px.$value).toBe('abc');
            px.$value = 'def';
            expect(a$.get()).toBe('def');
        });

        it('should use $lens when available', () => {
            const pd = new ProxyDescriptor<string>();
            pd.$lens = () => ({
                get: v => `...${v}`,
                set: v => v.substring(3),
            });
            const a$ = atom('value');
            const px = pd.$create(a$);
            expect(px.$value).toBe('...value');
            px.$value = '...another value';
            expect(px.$value).toBe('...another value');
            expect(a$.get()).toBe('another value');
        });

        it('should allow extra $ getters and setters', () => {
            class MyDescriptor extends ProxyDescriptor {
                get $type() {
                    return typeof this.$value;
                }
                set $type(newType) {
                    this.$value = newType;
                }
            }
            const px = new MyDescriptor().$create(atom({ key: 'value' })) as ProxyType<{ key: string }, { $type: string }>;
            expect(px.$value).toEqual({ key: 'value' });
            expect(px.$type).toBe('object');
            expect(px.key.$value).toBe('value');
            expect(px.key.$type).toBe('string');

            px.key.$type = 'object';
            expect(px.key.$value).toBe('object');
        });

        it('should allow extra $ methods', () => {
            class MyDescriptor extends ProxyDescriptor<{ prop: string }> {
                $toJSON() {
                    return JSON.stringify(this.$value);
                }
            }
            const px = new MyDescriptor().$create(atom({ prop: 'value' })) as ProxyType<{ prop: string }, { $toJSON(): string }>;
            expect(px.$toJSON()).toBe('{"prop":"value"}');
            expect(px.prop.$toJSON()).toBe('"value"');
        });

        it('should work on immutable values by default', () => {
            const value$ = atom(fromJS({ a: [1, 2, 3] }));
            const px = new ProxyDescriptor<any>().$create(value$) as ProxyType<{ a: number[] }>;
            expect(px.a[0].$value).toBe(1);
            expect(Seq.Indexed.of(1, 2, 3).equals(px.a.$value)).toBeTrue();

            px.a[3].$value = 4;
            expect(fromJS({ a: [1, 2, 3, 4] }).equals(value$.get())).toBeTrue();
        });

        it('should clear all $$-properties on $create', () => {
            const px = createForObject({ prop: 'value' }) as ProxyType<{ prop: string }, {
                $singleDollar: string,
                $$doubleDollar: string,
                $$derivable: any,
            }>;
            px.$singleDollar = 'a';
            px.$$doubleDollar = 'b';

            // Built-in $$derivable:
            expect(px.$$derivable).toBeUndefined();
            px.$value;
            expect(px.$$derivable).toBeDefined();

            expect(px.$singleDollar).toBe('a');
            expect(px.$$doubleDollar).toBe('b');

            const px2 = px.prop;
            // Should have no effect on the existing proxy
            expect(px.$$derivable).toBeDefined();
            expect(px.$singleDollar).toBe('a');
            expect(px.$$doubleDollar).toBe('b');

            expect(px2.$$derivable).toBeUndefined();
            expect(px2.$singleDollar).toBe('a');
            expect(px2.$$doubleDollar).toBeUndefined();
        });
    });

    describe('DerivableProxy', () => {
        describe('#$value', () => {
            it('should return the transformed value when a lens is provided', () => {
                const pd = new ProxyDescriptor<string>();
                pd.$lens = () => ({ get: v => v + '!', set: v => v });
                const px = pd.$create(constant('value'));
                expect(px.$value).toBe('value!');
            });

            it('should be settable when a lens is provided and the target is an Atom', () => {
                const a$ = atom('0801234567');
                const pd = new ProxyDescriptor<string>();
                pd.$lens = () => ({
                    get: v => v.substring(0, 3) + '-' + v.substring(3),
                    set: v => v.replace('-', ''),
                });
                const px = pd.$create(a$);
                expect(px.$value).toBe('080-1234567');
                px.$value = '030-4567890';
                expect(a$.get()).toBe('0304567890');
            });

            it('should not be settable when the target is not an Atom', () => {
                const px = new ProxyDescriptor().$create(constant('abc'));
                expect(() => px.$value = 'def').toThrowError();
            });

            it('should not shadow setter-errors with getter-errors', () => {
                const a$ = atom(0);
                const pd = new ProxyDescriptor<number>();
                pd.$lens = () => ({
                    get(): never { throw Error('from get'); },
                    set(): never { throw Error('from set'); },
                });
                const px = pd.$create(a$);
                expect(() => px.$value = 1).toThrowError('from set');
            });
        });

        describe('#$targetValue', () => {
            it('should return the target value regardless whether a lens is provided or not', () => {
                const pd = new ProxyDescriptor<string>();
                pd.$lens = () => ({ get: v => v + '!', set: v => v });
                pd.$target = constant('value');
                expect(pd.$targetValue).toBe('value');
            });

            it('should be settable when the target is an Atom regardless whether a lens is provided or not', () => {
                const a$ = atom('0801234567');
                const pd = new ProxyDescriptor<string>();
                pd.$lens = () => ({
                    get: v => v.substring(0, 3) + '-' + v.substring(3),
                    set: v => v.replace('-', ''),
                });
                pd.$target = a$;
                expect(pd.$targetValue).toBe('0801234567');
                pd.$targetValue = '0304567890';
                expect(a$.get()).toBe('0304567890');
            });

            it('should not be settable when the target is not an Atom', () => {
                const pd = new ProxyDescriptor();
                pd.$target = constant('abc');
                expect(() => pd.$targetValue = 'def').toThrowError();
            });

            it('should not shadow setter-errors with getter-errors', () => {
                const a$ = atom(0).map(
                    () => { throw Error('from get'); },
                    () => { throw Error('from set'); },
                );
                const pd = new ProxyDescriptor<number>();
                pd.$target = a$;
                expect(() => pd.$targetValue = 1).toThrowError('from set');
            });
        });

        [
            { method: '$and', identityValue: true },
            { method: '$or', identityValue: false },
            { method: '$is', identityValue: true },
        ].forEach(({ method, identityValue }) => {
            describe(`#${method}`, () => {
                it('should accept a DerivableProxy as parameter', () => {
                    const lhs = createForObject(identityValue);
                    const rhs = createForObject(false);
                    const result = lhs[method](rhs) as Derivable<boolean>;
                    expect(result.get()).toBe(false);
                    rhs.$value = true;
                    expect(result.get()).toBe(true);
                });

                it('should compare the lensed values of DerivableProxies', () => {
                    const pd = new ProxyDescriptor<boolean, number>();
                    // We force the target to be differing numbers, while the lensed value is the correct boolean.
                    let idx = 1;
                    pd.$lens = () => ({
                        get: v => v > 0,
                        set: v => v ? idx++ : -idx++,
                    });
                    const lhs = pd.$create(atom(0));
                    lhs.$value = identityValue;
                    const rhs = pd.$create(atom(0));
                    rhs.$value = false;
                    const result = lhs[method](rhs) as Derivable<boolean>;
                    expect(result.get()).toBe(false);
                    rhs.$value = true;
                    expect(result.get()).toBe(true);
                });

                it('should accept a Derivable as parameter', () => {
                    const lhs = createForObject(identityValue);
                    const rhs = atom(false);
                    const result = lhs[method](rhs) as Derivable<boolean>;
                    expect(result.get()).toBe(false);
                    rhs.set(true);
                    expect(result.get()).toBe(true);
                });

                it('should accept a value as parameter', () => {
                    const lhs = createForObject(identityValue);
                    const resultA = lhs[method](false) as Derivable<boolean>;
                    expect(resultA.get()).toBe(false);
                    const resultB = lhs[method](true) as Derivable<boolean>;
                    expect(resultB.get()).toBe(true);
                });
            });
        });

        describe('#$not', () => {
            it('should return a DerivableProxy that produces the (JavaScript) boolean inverse of the source', () => {
                const lhs = createForObject(true);
                const result = lhs.$not();
                expect(result.get()).toBe(false);
                lhs.$value = false;
                expect(result.get()).toBe(true);
            });
        });

        describe('#$derive', () => {
            it('should return a Derivable', () => {
                const px = createForObject('Hello');
                const der = px.$derive(v => v);
                expect(isDerivable(der)).toBe(true);
            });

            it('should provide the same signature as Derivable#derive', () => {
                const px = createForObject('Hello');
                const der = px.$derive((v, a, b) => v + a + b, ' world', '!');
                expect(der.get()).toBe('Hello world!');
            });
        });

        describe('#$react', () => {
            it('should provide the same signature as Derivable#react', () => {
                const px = createForObject('a');
                const results: string[] = [];
                const stop = px.$react(v => results.push(v));
                expect(results).toEqual(['a']);
                px.$value = 'b';
                expect(results).toEqual(['a', 'b']);
                stop();
            });
        });

        describe('(Object.prototype.*)', () => {
            it('should support #toString and #toLocaleString', () => {
                const obj = createForObject({ a: 1, toString() { return 'unseen'; } });
                expect(obj.toString()).toBe('[object DerivableProxy]');
                expect(obj.toLocaleString()).toBe('[object DerivableProxy]');
            });

            it('should not throw when #valueOf is used', () => {
                const obj = createForObject({ prop: 'value' });
                expect(obj.prop + '').toBe('[object DerivableProxy]');
            });

            it('should support #toJSON', () => {
                const obj = createForObject({ prop: 'value' });
                expect(JSON.stringify(obj)).toBe('{"prop":"value"}');
            });

            it('should support #hasOwnProperty', () => {
                const obj = createForObject({ prop: 'value' });
                expect(obj.hasOwnProperty('prop')).toBe(true);
                // DerivableProxies will always return other DerivableProxies on any pluckable property.
                // Even though 'whatever' does not exist in the data, the Proxy doesn't know that.
                expect(obj.hasOwnProperty('whatever')).toBe(true);
                // $expression, $target and other internal properties are hidden from view.
                expect(obj.hasOwnProperty('$expression')).toBe(false);
                expect(obj.hasOwnProperty('$target')).toBe(false);
                expect(obj.hasOwnProperty('$xxx')).toBe(false);
            });

            it('should support #isPrototypeOf', () => {
                const obj = createForObject({ prop: 'value' });
                expect(obj.isPrototypeOf({})).toBe(false);
            });

            it('should support #propertyIsEnumerable', () => {
                const obj = createForObject({ prop: 'value' });
                expect(obj.propertyIsEnumerable('prop')).toBe(true);
                expect(obj.propertyIsEnumerable('blabla')).toBe(true);
                expect(obj.propertyIsEnumerable('$react')).toBe(false);
                expect(obj.propertyIsEnumerable('$blabla')).toBe(false);
            });
        });

        it('should support the in operator', () => {
            const obj = createForObject({ prop1: 'value1', prop2: 'value2' });
            expect('prop' in obj).toBe(true);
            expect('blabla' in obj).toBe(true);
            expect('$react' in obj).toBe(false);
            expect('$blabla' in obj).toBe(false);
        });

        describe('(iteration)', () => {
            it('should support for ... in and Object.keys', () => {
                const obj = createForObject({ prop1: 'value1', prop2: 'value2' });
                const result: string[] = [];
                for (const p in obj) {
                    if (obj.hasOwnProperty(p)) {
                        result.push(p);
                    }
                }
                expect(result).toEqual(expect.arrayContaining(['prop1', 'prop2']));
                expect(Object.keys(obj)).toEqual(expect.arrayContaining(['prop1', 'prop2']));
            });

            it('should not break for ... in for primitive values', () => {
                const obj = createForObject(1234);
                const result = [];
                for (const p in obj) {
                    if (obj.hasOwnProperty(p)) {
                        result.push(p);
                    }
                }
                expect(Object.keys(result)).toHaveLength(0);
            });

            it('should support for ... of (ES5 style)', () => {
                const obj = createForObject(['value1', 'value2']) as any;
                const result = [];
                // tslint:disable-next-line:prefer-for-of
                for (let i = 0; i < obj.length; i++) {
                    result.push(obj[i].$value);
                }
                expect(result).toEqual(obj.$value);
            });

            it('should support for ... of (ES6 style)', () => {
                const obj = createForObject(['value1', 'value2']);
                const result = [];
                const iter: Iterator<ProxyType<string>> = obj[Symbol.iterator]();
                for (let item = iter.next(); !item.done; item = iter.next()) {
                    result.push(item.value.$value);
                }
                expect(result).toEqual(obj.$value);
            });

            it('should support TypeScript for ... of', () => {
                const obj = createForObject(['value1', 'value2']) as any;
                const result = [];
                for (const item of obj) {
                    result.push(item.$value);
                }
                expect(result).toEqual(obj.$value);
            });

            it('should throw when trying to iterate a non-iterable value', () => {
                const obj = createForObject(1234);
                const iter: Iterator<ProxyType<string>> = obj[Symbol.iterator]();
                expect(() => iter.next()).toThrowError('not iterable');
            });

            it('should report `Symbol.iterator in obj` only when the object is iterable', () => {
                expect(Symbol.iterator in createForObject([1, 2])).toBe(true);
                expect(Symbol.iterator in createForObject(1234)).toBe(false);
            });
        });

        describe('(iteration with overridden implementation)', () => {
            class LetterCount extends ProxyDescriptor<any, string> {
                $lens() {
                    return this.$expression !== undefined
                        ? undefined
                        : { get: (v: string) => v.split('').reduce((obj, letter) => (obj[letter] = (obj[letter] || 0) + 1, obj), {}) };
                }

                $pluck(prop: string | number) {
                    if (Number.isNaN(+prop)) {
                        return super.$pluck(prop);
                    }
                    return this.$create(this.$target.pluck(prop), extendExpression(this.$expression, prop));
                }

                $pluckableKeys() {
                    // return this.$targetValue.split('').filter(v => v.trim());
                    return Seq(this.$targetValue.split('').filter(v => v.trim())).toSet().toArray();
                }

                $length() {
                    return this.$targetValue.length;
                }
            }

            it('should support for ... in and Object.keys', () => {
                const obj = new LetterCount().$create(constant('this is pointless'));
                const result = {};
                for (const letter in obj) {
                    if (obj.hasOwnProperty(letter)) {
                        result[letter] = obj[letter].$value;
                    }
                }
                expect(result).toEqual({
                    t: 2,
                    h: 1,
                    i: 3,
                    s: 4,
                    p: 1,
                    o: 1,
                    n: 1,
                    l: 1,
                    e: 1,
                });
                expect(Object.keys(obj)).toEqual(expect.arrayContaining(['t', 'h', 'i', 's', 'p', 'o', 'n', 'l', 'e']));
            });

            it('should support for ... of (ES5 style)', () => {
                const obj = new LetterCount().$create(constant('also pointless')) as any;
                const result = [];
                // tslint:disable-next-line:prefer-for-of
                for (let i = 0; i < obj.length; i++) {
                    result.push(obj[i].$value);
                }
                expect(result).toEqual('also pointless'.split(''));
            });

            it('should support for ... of (ES6 style)', () => {
                const obj = new LetterCount().$create(constant('still pointless'));
                const result = [];
                const iter: Iterator<ProxyType<string>> = obj[Symbol.iterator]();
                for (let item = iter.next(); !item.done; item = iter.next()) {
                    result.push(item.value.$value);
                }
                expect(result).toEqual('still pointless'.split(''));
            });

            it('should support TypeScript for ... of', () => {
                const obj = new LetterCount().$create(constant('pointless')) as any;
                const result = [];
                for (const item of obj) {
                    result.push(item.$value);
                }
                expect(result).toEqual('pointless'.split(''));
            });
        });
    });
});
