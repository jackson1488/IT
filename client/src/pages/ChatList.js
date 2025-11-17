import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

function ChatList() {
    const navigate = useNavigate();
    const { user, token, logout } = useAuthStore();
    const {
        chats,
        users,
        fetchChats,
        fetchUsers,
        createChat,
        connectWebSocket,
        disconnectWebSocket
    } = useChatStore();

    const [showUserModal, setShowUserModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (token) {
            fetchChats(token);
            connectWebSocket(token);
        }

        return () => {
            disconnectWebSocket();
        };
    }, [token]);

    const handleNewChat = async () => {
        await fetchUsers(token);
        setShowUserModal(true);
    };

    const handleSelectUser = async (selectedUser) => {
        try {
            const chat = await createChat(token, selectedUser.id);
            setShowUserModal(false);
            navigate(`/chat/${chat.id}`);
        } catch (error) {
            console.error('Error creating chat:', error);
        }
    };

    const handleChatClick = (chat) => {
        navigate(`/chat/${chat.id}`);
    };

    const getAvatar = (username, avatar) => {
        if (avatar) {
            return <img src={avatar} alt={username} />;
        }
        return username.charAt(0).toUpperCase();
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="chat-container">
            <div className="chat-sidebar">
                <div className="sidebar-header">
                    <h2>Чаты</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="icon-btn" onClick={handleNewChat}>
                            + Новый
                        </button>
                        <button className="icon-btn" onClick={() => navigate('/profile')}>
                            Профиль
                        </button>
                        <button className="icon-btn" onClick={logout}>
                            Выход
                        </button>
                    </div>
                </div>

                <div className="chat-list">
                    {chats.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Нет чатов. Создайте новый чат!
                        </div>
                    ) : (
                        chats.map((chat) => (
                            <div
                                key={chat.id}
                                className="chat-item"
                                onClick={() => handleChatClick(chat)}
                            >
                                <div className="avatar">
                                    {getAvatar(chat.other_user.username, chat.other_user.avatar)}
                                </div>
                                <div className="chat-info">
                                    <div className="chat-name">
                                        {chat.other_user.username}
                                        {chat.other_user.is_online && (
                                            <span style={{
                                                marginLeft: '8px',
                                                color: 'var(--success-color)',
                                                fontSize: '12px'
                                            }}>
                                                • онлайн
                                            </span>
                                        )}
                                    </div>
                                    {chat.last_message && (
                                        <div className="chat-last-message">{chat.last_message}</div>
                                    )}
                                </div>
                                {chat.unread_count > 0 && (
                                    <div className="unread-badge">{chat.unread_count}</div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="chat-main" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h2>Выберите чат или создайте новый</h2>
                    <p>Выберите существующий чат слева или нажмите "+ Новый"</p>
                </div>
            </div>

            {showUserModal && (
                <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Выберите пользователя</h2>

                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Поиск пользователей..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div style={{ marginTop: '20px' }}>
                            {filteredUsers.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    Пользователи не найдены
                                </div>
                            ) : (
                                filteredUsers.map((u) => (
                                    <div
                                        key={u.id}
                                        className="user-item"
                                        onClick={() => handleSelectUser(u)}
                                    >
                                        <div className="avatar">
                                            {getAvatar(u.username, u.avatar)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{u.username}</div>
                                            {u.is_online ? (
                                                <span style={{ color: 'var(--success-color)', fontSize: '14px' }}>
                                                    Онлайн
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                                    Офлайн
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowUserModal(false)}
                            style={{ marginTop: '20px' }}
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatList;
