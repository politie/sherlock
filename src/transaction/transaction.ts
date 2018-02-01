import { Reactor, TrackedObservable } from '../tracking';

let currentTransaction: Transaction | undefined;

/**
 * Returns true iff we are currently in a transaction.
 */
export function inTransaction() {
    return !!currentTransaction;
}

/**
 * Processes a changed atom. The observertree starting at this atom will be marked stale. When not inside a transaction all
 * reactors in this tree will also get a chance to fire (otherwise they will be remembered and fired later).
 *
 * @param atom the atom that was changed
 * @param oldValue the previous value of the atom
 * @param oldVersion the previous version number of the atom
 */
export function processChangedAtom<V>(atom: TransactionAtom<V>, oldValue: V, oldVersion: number) {
    if (currentTransaction) {
        processChangedAtomInTransaction(currentTransaction, atom, oldValue, oldVersion);
    } else {
        const reactors: Reactor[] = [];
        markObservers(atom, reactors);
        reactIfNeeded(reactors);
    }
}

interface Transaction {
    /** The atoms that were touched in this transaction. */
    touchedAtoms: Array<TransactionAtom<any>>;
    /** The reactors that were reached in this transaction. */
    touchedReactors: Reactor[];
    /**
     * A mapping from atom.id to its value before this transaction. All atoms in touchedAtoms will have a corresponding
     * entry in this map.
     */
    oldValues: { [id: string]: any };
    /**
     * A mapping from atom.id to its version number before this transaction. All atoms in touchedAtoms will have a corresponding
     * entry in this map.
     */
    oldVersions: { [id: string]: number };
    /**
     * The parent transaction, if applicable, will become active again after this transaction ends and will inherit the
     * touched atoms and reactors.
     */
    parentTransaction: Transaction | undefined;
}

export interface TransactionAtom<V> extends TrackedObservable {
    value: V;
}

function markObservers(changedAtom: TransactionAtom<any>, reactorSink: Reactor[]) {
    for (const observer of changedAtom.observers) {
        observer.mark(reactorSink);
    }
}

function reactIfNeeded(reactors: Reactor[]) {
    for (const reactor of reactors) {
        reactor.reactIfNeeded();
    }
}

/**
 * Runs the given function inside a new transaction. Transactions can be nested. If a transaction is already running, this will nest
 * the new transaction inside the other. If the function completes normally it will commit the transaction, on a thrown Error it will
 * rollback. Returns the return value or rethrows the Error. Only when the outermost transaction completes normally all pending
 * reactions will fire, otherwise all atoms will be restored to their state before the transaction started.
 *
 * @param f the function to run in a transaction
 */
export function transact<R>(f: () => R): R {
    beginTransaction();
    let result: R;
    try {
        result = f();
    } catch (e) {
        rollbackTransaction();
        throw e;
    }
    commitTransaction();
    return result;
}

/**
 * Guarantees that f is called inside transaction, but will not create a new transaction when one is already running.
 *
 * @param f the function to run in a transaction
 */
export function atomically<R>(f: () => R): R {
    if (inTransaction()) {
        return f();
    } else {
        return transact(f);
    }
}

/**
 * A method decorator that ensures the method is always called atomically.
 *
 * @see atomically
 */
export function atomic(): MethodDecorator;

/**
 * Wraps the function to ensure it will always be called atomically.
 *
 * @param f the function to always call atomically
 * @see atomically
 */
export function atomic<F extends (...args: any[]) => any>(f: F): F;
export function atomic<F extends (...args: any[]) => any>(f?: F): MethodDecorator | F {
    if (f) {
        return function atomicFunction(this: any, ...args: any[]) {
            const ctx = this;
            return atomically(() => f.apply(ctx, args));
        };
    } else {
        return (_target: any, _propertyKey: any, descriptor: PropertyDescriptor) => {
            descriptor.value = descriptor.value && atomic(descriptor.value);
        };
    }
}

/**
 * A method decorator that ensures the method is always called in a new transaction.
 *
 * @see transact
 */
export function transaction(): MethodDecorator;

/**
 * Wraps the function to ensure it will always be called in a new transaction.
 *
 * @param f the function to always call in a new transaction
 * @see transact
 */
export function transaction<F extends (...args: any[]) => any>(f: F): F;
export function transaction<F extends (...args: any[]) => any>(f?: F): MethodDecorator | F {
    if (f) {
        return function transactionFunction(this: any, ...args: any[]) {
            const ctx = this;
            return transact(() => f.apply(ctx, args));
        };
    } else {
        return (_target: any, _propertyKey: any, descriptor: PropertyDescriptor) => {
            descriptor.value = descriptor.value && transaction(descriptor.value);
        };
    }
}

function beginTransaction() {
    currentTransaction = {
        touchedAtoms: [],
        oldValues: {},
        oldVersions: {},
        touchedReactors: [],
        parentTransaction: currentTransaction,
    };
}

function commitTransaction() {
    const ctx = currentTransaction;
    // istanbul ignore if: should never happen!
    if (!ctx) {
        throw new Error('No active transaction!');
    }
    currentTransaction = ctx.parentTransaction;

    if (currentTransaction) {
        // Hand over all info to the parent transaction
        ctx.touchedAtoms.forEach(atom => processChangedAtomInTransaction(
            currentTransaction!,
            atom,
            ctx.oldValues[atom.id],
            ctx.oldVersions[atom.id],
        ));
        // Not all reactors might be reached through notifyObservers. When
        // all paths between ctx.touchedAtoms and ctx.touchedReactors have
        // derivations with in !upToDate state in them, the reactors are not
        // added to currentTransaction.touchedReactors, therefore we have to
        // do it explicitly here.
        currentTransaction.touchedReactors.push(...ctx.touchedReactors);
    } else {
        // No parent transaction, so we just committed the outermost transaction, let's react.
        reactIfNeeded(ctx.touchedReactors);
    }
}

function rollbackTransaction() {
    const ctx = currentTransaction;
    // istanbul ignore if: should never happen!
    if (!ctx) {
        throw new Error('No active transaction!');
    }
    currentTransaction = ctx.parentTransaction;

    // Restore the state of all touched atoms.
    ctx.touchedAtoms.forEach(atom => {
        atom.value = ctx.oldValues[atom.id];
        atom.version = ctx.oldVersions[atom.id];
        markObservers(atom, []);
    });
}

function processChangedAtomInTransaction(txn: Transaction, atom: TransactionAtom<any>, oldValue: any, oldVersion: number) {
    markObservers(atom, txn.touchedReactors);
    const { id } = atom;
    if (!(id in txn.oldValues)) {
        txn.touchedAtoms.push(atom);
        txn.oldValues[id] = oldValue;
        txn.oldVersions[id] = oldVersion;
    }
}
