import { _internal, atom, constant, unresolved } from '@politie/sherlock';
import { copyState, dematerialize, getStateObject, materialize, setStateObject, StateObject, syncState } from './state';

describe('sherlock-utils/copyState', () => {
    it('should transfer value state', () => {
        const from$ = constant(123);
        const to$ = atom.unresolved();
        copyState(from$, to$);
        expect(to$.get()).toBe(123);
    });

    it('should transfer unresolved state', () => {
        const from$ = constant.unresolved();
        const to$ = atom(123);
        copyState(from$, to$);
        expect(to$.resolved).toBe(false);
    });

    it('should transfer error state', () => {
        const from$ = constant.error('womp womp');
        const to$ = atom(123);
        copyState(from$, to$);
        expect(to$.error).toBe('womp womp');
    });
});

describe('sherlock-utils/getState', () => {
    it('should return the state as a StateObject', () => {
        const a$ = atom(undefined);
        expect(getStateObject(a$)).toEqual({ value: undefined, errored: false, resolved: true });
        a$.setError(undefined);
        expect(getStateObject(a$)).toEqual({ error: undefined, errored: true, resolved: true });
        a$.unset();
        expect(getStateObject(a$)).toEqual({ errored: false, resolved: false });
    });

    it('should not call the internal getter more than once', () => {
        const a$ = atom(undefined);
        const getter = jest.spyOn(a$ as any as _internal.BaseDerivable<any>, _internal.symbols.internalGetState);
        getStateObject(a$);
        expect(getter).toHaveBeenCalledTimes(1);
        a$.setError(undefined);
        getStateObject(a$);
        expect(getter).toHaveBeenCalledTimes(2);
        a$.unset();
        getStateObject(a$);
        expect(getter).toHaveBeenCalledTimes(3);
    });
});

describe('sherlock-utils/materialize', () => {
    it('should materialize all possible states', () => {
        const a$ = atom(0);
        const error = new Error('this is not good!');
        const d$ = a$.map(v => {
            switch (v) {
                case 0: return 42;
                case 1: throw error;
                default: return unresolved;
            }
        });
        let reactions = 0;
        let state: StateObject<number> | undefined;
        const done = materialize(d$).react(newState => (state = newState, ++reactions));

        expect(reactions).toBe(1);
        expect(state).toEqual({ value: 42, errored: false, resolved: true });

        a$.set(1);

        expect(reactions).toBe(2);
        expect(state).toEqual({ error, errored: true, resolved: true });

        a$.set(2);

        expect(reactions).toBe(3);
        expect(state).toEqual({ errored: false, resolved: false });

        a$.set(0);

        expect(reactions).toBe(4);
        expect(state).toEqual({ value: 42, errored: false, resolved: true });

        done();
    });
});

describe('sherlock-utils/dematerialize', () => {
    it('should dematerialize all possible states', () => {
        const a$ = atom<StateObject<number>>({ errored: false, resolved: false });
        const d$ = dematerialize(a$);
        const error = new Error('this is not good!');

        expect(d$.resolved).toBe(false);

        a$.set({ value: 42, errored: false, resolved: true });

        expect(d$.value).toBe(42);

        a$.set({ error, errored: true, resolved: true });

        expect(d$.error).toBe(error);

        a$.set({ errored: false, resolved: false });

        expect(d$.resolved).toBe(false);

        a$.set({ value: 42, errored: false, resolved: true });

        expect(d$.value).toBe(42);
    });
});

describe('sherlock-utils/setState', () => {
    it('should set value state', () => {
        const to$ = atom.unresolved();
        setStateObject(to$, { value: 123, errored: false, resolved: true });
        expect(to$.get()).toBe(123);
    });

    it('should set unresolved state', () => {
        const to$ = atom(123);
        setStateObject(to$, { errored: false, resolved: false });
        expect(to$.resolved).toBe(false);
    });

    it('should set error state', () => {
        const to$ = atom(123);
        setStateObject(to$, { error: 'womp womp', errored: true, resolved: true });
        expect(to$.error).toBe('womp womp');
    });
});

describe('sherlock-utils/syncState', () => {
    it('should sync all possible states between the two Derivables', () => {
        const a$ = atom(0);
        const unresolved$ = constant.unresolved<number>();
        const error = new Error('this is not good!');
        const d$ = a$.derive(v => {
            switch (v) {
                case 0: return 42;
                case 1: throw error;
                default: return unresolved$.get() + 42;
            }
        });
        const target$ = atom.unresolved<number>();

        const done = syncState(d$, target$);

        expect(target$.value).toBe(42);

        a$.set(1);

        expect(target$.error).toBe(error);

        a$.set(2);

        expect(target$.resolved).toBe(false);

        a$.set(0);

        expect(target$.value).toBe(42);

        done();
    });

    it('should support lifecycle options', () => {
        const a$ = atom(0);
        const unresolved$ = constant.unresolved<number>();
        const error = new Error('this is not good!');
        const d$ = a$.derive(v => {
            switch (v) {
                case 0: return 42;
                case 1: throw error;
                default: return unresolved$.get() + 42;
            }
        });
        const until = atom(false);
        const target$ = atom.unresolved<number>();

        syncState(d$, target$, { until });

        expect(target$.value).toBe(42);

        a$.set(1);

        expect(target$.error).toBe(error);

        a$.set(2);

        expect(target$.resolved).toBe(false);

        a$.set(0);

        expect(target$.value).toBe(42);

        until.set(true);
        a$.set(1);

        // not changed
        expect(target$.value).toBe(42);
    });
});
