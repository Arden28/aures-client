// echo.ts
import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
    interface Window {
        Pusher: any;
        Echo: any;
    }
}

window.Pusher = Pusher;

const getPort = () => {
    const val = Number(import.meta.env.VITE_REVERB_PORT);
    return Number.isNaN(val) ? 80 : val;
};

const createEcho = () => {
    const port = getPort();
    
    // 1. Get your API Base URL (adjust fallback as needed)
    // If you have VITE_API_URL defined in .env, use that.
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";

    return new Echo({
        broadcaster: "reverb",
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: port,
        wssPort: port,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "https") === "https",
        enabledTransports: ["ws", "wss"],

        // 2. Point to the correct Backend Auth Route
        // Note: Check if your route is '/broadcasting/auth' or '/api/broadcasting/auth'
        authEndpoint: `${apiBase}/api/broadcasting/auth`, 

        // 3. Pass the Token for Private Channel Access
        auth: {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('authToken')}`, 
                Accept: 'application/json',
            },
        },
    });
};

export const echo = createEcho();