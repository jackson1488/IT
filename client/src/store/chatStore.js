import { create } from 'zustand';
import { api } from '../api/api';

export const useChatStore = create((set, get) => ({
    chats: [],
    currentChat: null,
    messages: [],
    users: [],
    ws: null,
    isConnected: false,

    // WebSocket connection
    connectWebSocket: (token) => {
        const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
        const ws = new WebSocket(`${wsUrl}/ws?token=${token}`);

        ws.onopen = () => {
            console.log('WebSocket connected');
            set({ isConnected: true });
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            get().handleWebSocketMessage(data);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            set({ isConnected: false });

            // Reconnect after 3 seconds
            setTimeout(() => {
                if (token) {
                    get().connectWebSocket(token);
                }
            }, 3000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        set({ ws });
    },

    disconnectWebSocket: () => {
        const ws = get().ws;
        if (ws) {
            ws.close();
            set({ ws: null, isConnected: false });
        }
    },

    handleWebSocketMessage: (data) => {
        const { type, data: payload } = data;

        switch (type) {
            case 'message':
                get().addMessage(payload);
                get().updateChatLastMessage(payload.chat_id, payload.text);
                break;

            case 'typing':
                // Handle typing indicator
                console.log('User typing:', payload);
                break;

            case 'user_status':
                get().updateUserStatus(payload.user_id, payload.is_online);
                break;

            case 'webrtc_signal':
                // Handle WebRTC signaling
                if (get().onWebRTCSignal) {
                    get().onWebRTCSignal(payload);
                }
                break;

            case 'messages_read':
                get().markMessagesAsRead(payload.message_ids);
                break;

            default:
                console.log('Unknown message type:', type);
        }
    },

    sendWebSocketMessage: (message) => {
        const ws = get().ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    },

    // Chats
    fetchChats: async (token) => {
        try {
            const response = await api.get('/api/chats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ chats: response.data });
        } catch (error) {
            console.error('Failed to fetch chats:', error);
        }
    },

    createChat: async (token, userId) => {
        try {
            const response = await api.post('/api/chats',
                { user2_id: userId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const newChat = response.data;
            set(state => ({
                chats: [newChat, ...state.chats]
            }));

            return newChat;
        } catch (error) {
            console.error('Failed to create chat:', error);
            throw error;
        }
    },

    setCurrentChat: (chat) => {
        set({ currentChat: chat, messages: [] });
    },

    updateChatLastMessage: (chatId, text) => {
        set(state => ({
            chats: state.chats.map(chat =>
                chat.id === chatId
                    ? { ...chat, last_message: text }
                    : chat
            )
        }));
    },

    // Messages
    fetchMessages: async (token, chatId) => {
        try {
            const response = await api.get(`/api/chats/${chatId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ messages: response.data });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            return [];
        }
    },

    sendMessage: (chatId, text, file = null) => {
        const message = {
            type: 'message',
            chat_id: chatId,
            text,
            file
        };

        get().sendWebSocketMessage(message);
    },

    addMessage: (message) => {
        set(state => {
            // Check if message already exists
            if (state.messages.find(m => m.id === message.id)) {
                return state;
            }

            return {
                messages: [...state.messages, {
                    id: message.id,
                    chat_id: message.chat_id,
                    sender_id: message.sender_id,
                    text: message.text,
                    file: message.file,
                    timestamp: message.timestamp,
                    is_read: message.is_read,
                    sender: {
                        id: message.sender_id,
                        username: message.sender_username,
                        avatar: message.sender_avatar
                    }
                }]
            };
        });
    },

    markMessagesAsRead: (messageIds) => {
        set(state => ({
            messages: state.messages.map(msg =>
                messageIds.includes(msg.id)
                    ? { ...msg, is_read: true }
                    : msg
            )
        }));
    },

    sendMarkRead: (messageIds) => {
        get().sendWebSocketMessage({
            type: 'mark_read',
            message_ids: messageIds
        });
    },

    // Users
    fetchUsers: async (token, search = '') => {
        try {
            const response = await api.get('/api/users', {
                headers: { Authorization: `Bearer ${token}` },
                params: { search }
            });
            set({ users: response.data });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch users:', error);
            return [];
        }
    },

    updateUserStatus: (userId, isOnline) => {
        set(state => ({
            chats: state.chats.map(chat => {
                if (chat.other_user.id === userId) {
                    return {
                        ...chat,
                        other_user: { ...chat.other_user, is_online: isOnline }
                    };
                }
                return chat;
            })
        }));
    },

    // WebRTC
    onWebRTCSignal: null,

    setWebRTCSignalHandler: (handler) => {
        set({ onWebRTCSignal: handler });
    },

    sendWebRTCSignal: (signalType, targetUserId, payload) => {
        get().sendWebSocketMessage({
            type: 'webrtc_signal',
            signal_type: signalType,
            target_user_id: targetUserId,
            payload
        });
    },

    // Typing indicator
    sendTyping: (chatId, targetUserId, isTyping) => {
        get().sendWebSocketMessage({
            type: 'typing',
            chat_id: chatId,
            target_user_id: targetUserId,
            is_typing: isTyping
        });
    }
}));
