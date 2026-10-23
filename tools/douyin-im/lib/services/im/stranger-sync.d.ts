import type { ImService } from './service.js';
import type { ImStateStore } from './state-store.js';
import type { ImActionResponse, RecentStrangerMessagesResponse } from './types.js';
export interface StrangerSyncResult extends ImActionResponse {
    pages: number;
    conversations: number;
}
export declare class StrangerSync {
    private readonly options;
    private transient;
    private stopped;
    private refreshing?;
    private loading?;
    constructor(options: {
        im: Pick<ImService, 'getRecentStrangerMessages'>;
        store?: Pick<ImStateStore, 'getStrangerSyncCursors' | 'setStrangerSyncCursors'>;
        assertActive(): void;
        consumePage(page: RecentStrangerMessagesResponse): void | Promise<void>;
    });
    close(): void;
    refresh(): Promise<StrangerSyncResult>;
    loadMore(): Promise<StrangerSyncResult>;
    private assertActive;
    private cursors;
    private commit;
    private run;
}
//# sourceMappingURL=stranger-sync.d.ts.map