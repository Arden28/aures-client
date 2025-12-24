import {v4 as uuidv4} from 'uuid';

export const getDeviceId = (): string => {
    let deviceId = localStorage.getItem('app_device_id');
    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem('app_device_id', deviceId);
    }

    return deviceId;
};