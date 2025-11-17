import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

function Profile() {
    const navigate = useNavigate();
    const { user, updateProfile, theme, setTheme, logout } = useAuthStore();

    const [username, setUsername] = useState(user?.username || '');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setAvatarFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        try {
            const updates = {};

            if (username !== user.username) {
                updates.username = username;
            }

            if (avatarFile) {
                // Convert to base64
                const reader = new FileReader();
                reader.onloadend = async () => {
                    updates.avatar = reader.result;
                    await updateProfile(updates);
                    setMessage('Профиль успешно обновлен');
                    setIsLoading(false);
                };
                reader.readAsDataURL(avatarFile);
                return;
            }

            if (Object.keys(updates).length > 0) {
                await updateProfile(updates);
                setMessage('Профиль успешно обновлен');
            }
        } catch (error) {
            setMessage('Ошибка при обновлении профиля');
        }

        setIsLoading(false);
    };

    const handleThemeChange = async (newTheme) => {
        try {
            await updateProfile({ theme: newTheme });
            setTheme(newTheme);
        } catch (error) {
            console.error('Failed to update theme:', error);
        }
    };

    const getAvatar = () => {
        if (avatarPreview) {
            return <img src={avatarPreview} alt={username} />;
        }
        return username.charAt(0).toUpperCase();
    };

    return (
        <div className="profile-container">
            <div className="profile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <button className="icon-btn" onClick={() => navigate('/chat')}>
                        ← Назад
                    </button>
                    <button className="icon-btn" onClick={logout}>
                        Выход
                    </button>
                </div>

                <h1>Профиль</h1>

                {message && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '6px',
                        background: 'var(--success-color)',
                        color: 'white',
                        marginBottom: '20px'
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="profile-avatar">
                        <div className="avatar">
                            {getAvatar()}
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                            id="avatar-input"
                        />
                        <label
                            htmlFor="avatar-input"
                            style={{
                                marginTop: '12px',
                                cursor: 'pointer',
                                color: 'var(--primary-color)',
                                fontWeight: '600'
                            }}
                        >
                            Изменить аватар
                        </label>
                    </div>

                    <div className="form-group">
                        <label>Имя пользователя</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            minLength={3}
                        />
                    </div>

                    <div className="form-group">
                        <label>Тема оформления</label>
                        <div className="theme-toggle">
                            <button
                                type="button"
                                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                                onClick={() => handleThemeChange('light')}
                            >
                                ☀️ Светлая
                            </button>
                            <button
                                type="button"
                                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                                onClick={() => handleThemeChange('dark')}
                            >
                                🌙 Темная
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Profile;
