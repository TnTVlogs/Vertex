export interface User {
    id: string;
    username: string;
    avatar?: string;
    status: 'online' | 'offline' | 'idle' | 'dnd';
}
export interface Message {
    id: string;
    senderId: string;
    content: string;
    timestamp: Date;
    imageUrl?: string;
}
export interface Chat {
    id: string;
    participants: User[];
    messages: Message[];
}
