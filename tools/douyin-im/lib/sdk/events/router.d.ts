import type { BaseEvent } from '../../base/event.js';
import type { Account } from '../account.js';
type Emit = (event: string, payload?: unknown) => boolean;
export declare function emitEventRoutes(emit: Emit, event: BaseEvent<Account>): void;
export {};
//# sourceMappingURL=router.d.ts.map