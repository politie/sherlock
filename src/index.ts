export {
    atom,
    constant,
    DataSource,
    derive,
    isDerivable,
    isSettableDerivable,
    lens,
    unwrap,
} from './derivable';

export {
    Derivable,
    DerivableAtom,
    Fallback,
    ReactorOptions,
    ReactorOptionValue,
    SettableDerivable,
    StandaloneLensDescriptor,
    State,
    TargetedLensDescriptor,
    ToPromiseOptions,
    Unwrappable,
} from './interfaces';

export {
    atomic,
    atomically,
    inTransaction,
    transact,
    transaction,
} from './transaction';

export {
    config,
} from './utils';

import * as _internal from './internal';

import { resolveFallback } from './derivable';
import { clone, equals, isPlainObject } from './utils';
const utils = {
    clone,
    equals,
    isPlainObject,
    resolveFallback,
};

export {
    utils,
    _internal,
};
