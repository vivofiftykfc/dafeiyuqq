export interface WorkCard {
    itemId: string;
    title?: string;
    authorUid?: string;
    authorSecUid?: string;
    authorName?: string;
    coverUrl?: string;
    imageCount?: number;
}
export interface LinkCard {
    url: string;
    title?: string;
    description?: string;
    coverUrl?: string;
}
export interface UserCard {
    uid: string;
    secUid?: string;
    name?: string;
    avatarUrl?: string;
}
export interface FileAsset {
    uri: string;
    skey: string;
    md5: string;
    name: string;
    dataSize: number;
}
export interface GroupInvitationCard {
    groupId: string;
    shortId: string;
    inviterUid: string;
    inviterSecUid: string;
    avatarUrl: string;
    memberCount?: number;
    name?: string;
    ownerName: string | null;
    ownerUid?: string;
    ownerSecUid?: string;
}
export type CardMessage = {
    type: 'group-invite';
    group: GroupInvitationCard;
} | {
    type: 'share';
    work: WorkCard;
} | {
    type: 'photos';
    work: WorkCard;
} | {
    type: 'link';
    link: LinkCard;
} | {
    type: 'user';
    user: UserCard;
} | {
    type: 'file';
    file: FileAsset;
};
export declare function buildCardMessage(message: CardMessage): {
    content: string;
    messageType: number;
};
//# sourceMappingURL=cards.d.ts.map