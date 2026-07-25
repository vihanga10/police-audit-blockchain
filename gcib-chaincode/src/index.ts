/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {type Contract} from 'fabric-contract-api';
import {GCIBContract} from './gcibContract';

export {GCIBContract} from './gcibContract';

export const contracts: typeof Contract[] = [GCIBContract];