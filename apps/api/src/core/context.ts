// GELE : Daniel. Tout ce dont un module a besoin.
import type { Db } from '../../../../db/lib.ts';
import type { Config } from './config.ts';
export interface Ctx { db: Db; config: Config; now: () => Date }
