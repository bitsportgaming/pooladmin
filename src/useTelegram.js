import { useState, useEffect } from 'react';

const useTelegram = () => {
    const [tg, setTg] = useState(null);

    useEffect(() => {
        const loadTelegramWebApp = () => {
            if (window.Telegram && window.Telegram.WebApp) {
                setTg(window.Telegram.WebApp);
            } else {
                console.log("Telegram WebApp not available");
            }
        };

        if (document.readyState === 'complete') {
            loadTelegramWebApp();
        } else {
            window.addEventListener('load', loadTelegramWebApp);
            return () => window.removeEventListener('load', loadTelegramWebApp);
        }
    }, []);

    return tg;
};

export default useTelegram;