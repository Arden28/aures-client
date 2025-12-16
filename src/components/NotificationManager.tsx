// Define the base64 URL-safe key
const VAPID_PUBLIC_KEY: string = 'BPNpfAxYLRWRYM84xeWgqjZQQfjFj9IT6GCaHgkdL6NIigVuv3Qh21yU68AuC8C4L04K9x6eZqFRplhPOnB4qe0';

/**
 * Converts a VAPID public key from a base64 URL-safe string to a Uint8Array.
 * This is required by the browser's pushManager.subscribe() method.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    // Note: The rest of your existing logic for padding and replacement is correct
    // for URL-safe Base64 conversion, which is necessary here.
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
        
    const rawData = window.atob(base64);
    
    // Explicitly create the Uint8Array with the correct length
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
}


/**
 * Requests notification permission from the user and subscribes the user to the Push Service.
 * The resulting subscription is sent to the backend server.
 */
async function requestNotificationPermission(): Promise<void> {
    // 1. Check if the browser supports the API
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('Push messaging or Notifications are not fully supported by this browser.');
        return;
    }
    
    try {
        // 2. Request permission from the user
        // Notification.requestPermission() returns a Promise<NotificationPermission>
        const permission: NotificationPermission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('Notification permission granted!');
            
            // 3. Get the PushSubscription (requires a registered Service Worker)
            const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;
            
            // pushManager.subscribe returns a Promise<PushSubscription>
            const subscription: PushSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                // TypeScript is overly strict here, but the browser expects the Uint8Array.
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
            });

            // console.log('User is subscribed:', subscription);

            // 4. Send subscription data to your backend for storage
            // The subscription object is the data your server needs to send push messages
            const response = await fetch('/api/subscribe', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription), // Send the JSON representation of the subscription
            });
            
            if (!response.ok) {
                console.error('Failed to send subscription to backend:', response.statusText);
            }

        } else {
            console.warn('Notification permission denied or dismissed.');
        }
    } catch (error) {
        // Log errors related to subscription (e.g., VAPID key issues, network failure)
        console.error('An error occurred during notification subscription:', error);
    }
}

// Example usage within a React component:
// const MyComponent: React.FC = () => (
//   <button onClick={requestNotificationPermission}>Enable Notifications</button>
// );
