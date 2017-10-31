import { registerLogHandler } from '@politie/informant';
import { use } from 'chai';
import * as chaiImmutable from 'chai-immutable';
import * as sinonChai from 'sinon-chai';
import './index';

use(sinonChai);
use(chaiImmutable);

registerLogHandler(logRecord => { throw new Error(logRecord.message); });
