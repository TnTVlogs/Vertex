export interface User {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
    status: 'online' | 'offline' | 'idle' | 'dnd';
}
export interface Message {
    id: string;
    content: string;
    attachmentUrl?: string;
    authorId: string;
    channelId?: string;
    recipientId?: string;
    createdAt: string | Date;
    author?: {
        id: string;
        username: string;
        avatarUrl?: string;
    };
    status?: 'sending' | 'error' | 'sent';
}
export interface Server {
    id: string;
    name: string;
    iconUrl?: string;
    ownerId: string;
    owner_id?: string;
    inviteCode?: string | null;
    inviteExpiresAt?: string | null;
}
export interface ServerMember {
    id: string;
    userId: string;
    serverId: string;
    username: string;
    role: 'ADMIN' | 'MEMBER';
}
export interface Channel {
    id: string;
    serverId: string;
    name: string;
    type: 'text' | 'voice';
}
//# sourceMappingURL=models.d.ts.map