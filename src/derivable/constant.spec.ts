import { testDerivable } from './base-derivable.spec';
import { constant } from './factories';
import { unresolved } from './symbols';

describe('derivable/constant', () => {
    testDerivable(v => v === unresolved ? constant.unresolved() : constant(v), true);
});
