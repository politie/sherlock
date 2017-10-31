import { expect } from 'chai';
import { atom } from '../derivable';
import { struct } from './struct';

describe('extras/struct', () => {
    it('should throw on unexpected input', () => {
        expect(() => struct(undefined as any)).to.throw();
        expect(() => struct(123 as any)).to.throw();
        expect(() => struct(new Date)).to.throw();
    });

    it('should accept Derivables, literal Objects and Arrays', () => {
        struct({});
        struct([]);
        struct(atom(123));
    });

    it('should copy any other value type as-is', () => {
        const obj = {
            date: new Date(),
            number: 123,
            string: 'asdf',
            strings: ['asdf', 'sdfg'],
        };
        expect(struct(obj).get()).to.deep.equal(obj);
    });

    it('should return a Derivables as is', () => {
        const a = atom(123);
        expect(struct(a)).to.equal(a);
    });

    it('should turn an array of derivables into an unpacked derivable', () => {
        const number1$ = atom(1);
        const number2$ = atom(2);
        const number3$ = number1$.derive(n => n + number2$.get());

        const number$s = [number1$, number2$, number3$];
        const numbers$ = struct<typeof number$s, number>(number$s);

        expect(numbers$.get()).to.deep.equal([1, 2, 3]);

        number2$.set(3);
        expect(numbers$.get()).to.deep.equal([1, 3, 4]);
    });

    it('should turn a map of derivables into an unpacked derivable', () => {
        const name$ = atom('Edwin');
        const tel$ = atom('0612345678');
        const person = { name: name$, tel: tel$ };
        const person$ = struct<typeof person, string>(person);

        expect(person$.get()).to.deep.equal({ name: 'Edwin', tel: '0612345678' });

        tel$.set('n/a');

        expect(person$.get()).to.deep.equal({ name: 'Edwin', tel: 'n/a' });
    });

    it('should turn any nested structure of maps and arrays into an unpacked derivable', () => {
        const name$ = atom('Edwin');
        const tel$ = atom('0612345678');
        const friendName$ = atom('Peter');
        const friendTel$ = atom('0698765432');

        const obj = {
            name: name$,
            tel: tel$,
            friends: [
                {
                    name: friendName$,
                    tel: friendTel$,
                },
            ],
        };
        const nested$ = struct(obj);

        expect(nested$.get()).to.deep.equal({
            name: 'Edwin',
            tel: '0612345678',
            friends: [
                {
                    name: 'Peter',
                    tel: '0698765432',
                },
            ],
        });

        friendTel$.set('changed but did not tell');

        expect(nested$.get()).to.deep.equal({
            name: 'Edwin',
            tel: '0612345678',
            friends: [
                {
                    name: 'Peter',
                    tel: 'changed but did not tell',
                },
            ],
        });
    });
});
