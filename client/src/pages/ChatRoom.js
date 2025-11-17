import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { WebRTCManager } from '../webrtc/webrtc';

function ChatRoom() {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const { user, token } = useAuthStore();
    const {
        currentChat,
        messages,
        chats,
        setCurrentChat,
        fetchMessages,
        sendMessage,
        sendTyping,
        sendMarkRead,
        setWebRTCSignalHandler,
        sendWebRTCSignal
    } = useChatStore();

    const [messageText, setMessageText] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [callType, setCallType] = useState(null); // 'audio' or 'video'
    const [incomingCall, setIncomingCall] = useState(null);
    const [webrtc, setWebrtc] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [localStream, setLocalStream] = useState(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        const chat = chats.find(c => c.id === parseInt(chatId));
        if (chat) {
            setCurrentChat(chat);
            fetchMessages(token, chatId);
        }
    }, [chatId, chats, token]);

    useEffect(() => {
        scrollToBottom();

        // Mark messages as read
        if (messages.length > 0) {
            const unreadIds = messages
                .filter(m => m.sender_id !== user.id && !m.is_read)
                .map(m => m.id);

            if (unreadIds.length > 0) {
                sendMarkRead(unreadIds);
            }
        }
    }, [messages]);

    useEffect(() => {
        // Set up WebRTC signal handler
        setWebRTCSignalHandler((signal) => {
            if (signal.signal_type === 'offer') {
                setIncomingCall({
                    from_user_id: signal.from_user_id,
                    signal: signal
                });
            } else if (webrtc) {
                webrtc.handleSignal(signal);
            }
        });

        return () => {
            setWebRTCSignalHandler(null);
            if (webrtc) {
                webrtc.cleanup();
            }
        };
    }, [webrtc]);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = (e) => {
        e.preventDefault();

        if (!messageText.trim() && !imageFile) return;

        if (imageFile) {
            // Convert image to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                sendMessage(parseInt(chatId), messageText, reader.result);
                setMessageText('');
                setImageFile(null);
            };
            reader.readAsDataURL(imageFile);
        } else {
            sendMessage(parseInt(chatId), messageText, null);
            setMessageText('');
        }
    };

    const handleTyping = () => {
        if (currentChat) {
            sendTyping(parseInt(chatId), currentChat.other_user.id, true);

            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Stop typing after 3 seconds of inactivity
            typingTimeoutRef.current = setTimeout(() => {
                sendTyping(parseInt(chatId), currentChat.other_user.id, false);
            }, 3000);
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
        }
    };

    const handleStartCall = async (type) => {
        setCallType(type);
        setIsCallActive(true);

        const rtcManager = new WebRTCManager(
            (signalType, payload) => {
                sendWebRTCSignal(signalType, currentChat.other_user.id, payload);
            },
            (stream) => {
                setRemoteStream(stream);
            },
            () => {
                handleEndCall();
            }
        );

        try {
            const stream = await rtcManager.initCall(true);
            setLocalStream(stream);
            setWebrtc(rtcManager);
        } catch (error) {
            console.error('Failed to start call:', error);
            alert('Не удалось начать звонок. Проверьте разрешения на камеру/микрофон.');
            handleEndCall();
        }
    };

    const handleAcceptCall = async () => {
        if (!incomingCall) return;

        setCallType('video');
        setIsCallActive(true);

        const rtcManager = new WebRTCManager(
            (signalType, payload) => {
                sendWebRTCSignal(signalType, incomingCall.from_user_id, payload);
            },
            (stream) => {
                setRemoteStream(stream);
            },
            () => {
                handleEndCall();
            }
        );

        try {
            const stream = await rtcManager.initCall(false);
            setLocalStream(stream);
            setWebrtc(rtcManager);

            // Handle the incoming signal
            rtcManager.handleSignal(incomingCall.signal);
            setIncomingCall(null);
        } catch (error) {
            console.error('Failed to accept call:', error);
            alert('Не удалось принять звонок. Проверьте разрешения на камеру/микрофон.');
            handleEndCall();
        }
    };

    const handleRejectCall = () => {
        setIncomingCall(null);
    };

    const handleEndCall = () => {
        if (webrtc) {
            webrtc.cleanup();
            setWebrtc(null);
        }
        setIsCallActive(false);
        setCallType(null);
        setRemoteStream(null);
        setLocalStream(null);
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    const getAvatar = (username, avatar) => {
        if (avatar) {
            return <img src={avatar} alt={username} />;
        }
        return username.charAt(0).toUpperCase();
    };

    if (!currentChat) {
        return <div>Загрузка...</div>;
    }

    return (
        <div className="chat-container">
            <div className="chat-main">
                <div className="chat-header">
                    <div className="chat-header-info">
                        <button
                            className="icon-btn"
                            onClick={() => navigate('/chat')}
                            style={{ marginRight: '12px' }}
                        >
                            ← Назад
                        </button>
                        <div className="avatar">
                            {getAvatar(currentChat.other_user.username, currentChat.other_user.avatar)}
                        </div>
                        <div>
                            <div style={{ fontWeight: '600' }}>{currentChat.other_user.username}</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                {currentChat.other_user.is_online ? 'Онлайн' : 'Офлайн'}
                            </div>
                        </div>
                    </div>

                    <div className="chat-header-actions">
                        <button className="icon-btn" onClick={() => handleStartCall('audio')}>
                            🎤 Аудио
                        </button>
                        <button className="icon-btn" onClick={() => handleStartCall('video')}>
                            📹 Видео
                        </button>
                    </div>
                </div>

                <div className="messages-container">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`message ${msg.sender_id === user.id ? 'own' : ''}`}
                        >
                            <div className="avatar">
                                {getAvatar(msg.sender.username, msg.sender.avatar)}
                            </div>
                            <div>
                                <div className="message-content">
                                    {msg.text && <div>{msg.text}</div>}
                                    {msg.file && (
                                        <img
                                            src={msg.file}
                                            alt="attachment"
                                            className="message-image"
                                        />
                                    )}
                                </div>
                                <div className="message-time">
                                    {formatTime(msg.timestamp)}
                                    {msg.sender_id === user.id && msg.is_read && ' ✓✓'}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <form className="message-input" onSubmit={handleSendMessage}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />

                    <button
                        type="button"
                        className="icon-btn"
                        onClick={() => fileInputRef.current.click()}
                    >
                        📎
                    </button>

                    <input
                        type="text"
                        value={messageText}
                        onChange={(e) => {
                            setMessageText(e.target.value);
                            handleTyping();
                        }}
                        placeholder={imageFile ? `Выбрано: ${imageFile.name}` : "Введите сообщение..."}
                    />

                    {imageFile && (
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setImageFile(null)}
                        >
                            ✕
                        </button>
                    )}

                    <button type="submit" className="btn-primary">
                        Отправить
                    </button>
                </form>
            </div>

            {/* Incoming call modal */}
            {incomingCall && (
                <div className="modal-overlay">
                    <div className="call-modal">
                        <h2>Входящий звонок</h2>
                        <p>От: {currentChat.other_user.username}</p>
                        <div className="call-actions">
                            <button className="btn btn-primary" onClick={handleAcceptCall}>
                                Принять
                            </button>
                            <button className="btn btn-secondary" onClick={handleRejectCall}>
                                Отклонить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Active call modal */}
            {isCallActive && (
                <div className="modal-overlay">
                    <div className="call-modal" style={{ minWidth: '600px' }}>
                        <h2>{callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}</h2>

                        {callType === 'video' && (
                            <div className="video-container">
                                <video ref={remoteVideoRef} autoPlay playsInline />
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="local-video"
                                />
                            </div>
                        )}

                        {callType === 'audio' && (
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                <p>Аудиозвонок активен</p>
                                <audio ref={remoteVideoRef} autoPlay />
                            </div>
                        )}

                        <div className="call-actions">
                            {webrtc && (
                                <>
                                    <button
                                        className="icon-btn"
                                        onClick={() => webrtc.toggleAudio()}
                                    >
                                        🎤 Микрофон
                                    </button>
                                    {callType === 'video' && (
                                        <button
                                            className="icon-btn"
                                            onClick={() => webrtc.toggleVideo()}
                                        >
                                            📹 Камера
                                        </button>
                                    )}
                                </>
                            )}
                            <button className="btn btn-secondary" onClick={handleEndCall}>
                                Завершить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatRoom;
