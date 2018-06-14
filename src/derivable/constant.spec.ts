import { testDerivable } from './base-derivable.spec';
import { constant } from './factories';

describe('derivable/constant', () => {
    testDerivable(constant, true);
});
