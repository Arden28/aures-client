import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
    interface Window {
        Pusher: any;
        Echo: any;
    }
}

window.Pusher = Pusher;

const createEcho = () => {
    // 1. Get your API Base URL
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";

    return new Echo({
        broadcaster: "pusher",
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
        forceTLS: true,

        // 2. Point to the correct Backend Auth Route
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