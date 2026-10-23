import { conversationIsFolded } from './setting-command.js';
const settingKeys = [
    'settingVersion', 'settingExt', 'settingExtVersions', 'minIndex', 'readIndex',
    'muted', 'pinned', 'favorite', 'setTopTime', 'setFavoriteTime',
    'readIndexV2', 'minIndexV2', 'readBadgeCount',
];
const defaults = {
    settingVersion: '0', settingExt: {}, settingExtVersions: {}, minIndex: '0', readIndex: '0',
    muted: false, pinned: false, favorite: false, setTopTime: '0', setFavoriteTime: '0',
    readIndexV2: '0', minIndexV2: '0', readBadgeCount: 0,
};
export function mergeConversationSettings(current, incoming) {
    const previousVersion = current?.settingVersion ?? '0';
    if (incoming.settingVersion !== undefined && BigInt(incoming.settingVersion) < BigInt(previousVersion)) {
        const result = { ...incoming };
        for (const key of settingKeys)
            delete result[key];
        Object.assign(result, defaults, current ? Object.fromEntries(settingKeys
            .filter(key => current[key] !== undefined)
            .map(key => [key, current[key]])) : {});
        result.settingExt = { ...current?.settingExt };
        result.settingExtVersions = { ...current?.settingExtVersions };
        result.isFolded = conversationIsFolded(result.settingExt);
        return result;
    }
    const readIndexV2 = incoming.readIndexV2 ?? '0';
    const previousReadIndexV2 = current?.readIndexV2 ?? '0';
    return {
        ...incoming,
        settingVersion: incoming.settingVersion ?? previousVersion,
        minIndex: incoming.minIndex ?? '0',
        readIndex: incoming.readIndex ?? '0',
        muted: incoming.muted ?? false,
        pinned: incoming.pinned ?? false,
        favorite: incoming.favorite ?? false,
        setTopTime: incoming.setTopTime ?? '0',
        setFavoriteTime: incoming.setFavoriteTime ?? '0',
        readIndexV2: BigInt(readIndexV2) > BigInt(previousReadIndexV2) ? readIndexV2 : previousReadIndexV2,
        minIndexV2: incoming.minIndexV2 ?? '0',
        readBadgeCount: Math.max(current?.readBadgeCount ?? 0, incoming.readBadgeCount ?? 0),
        settingExt: { ...incoming.settingExt },
        settingExtVersions: { ...incoming.settingExtVersions },
        isFolded: conversationIsFolded(incoming.settingExt),
    };
}
//# sourceMappingURL=conversation-settings.js.map