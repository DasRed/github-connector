import options from '../options.js';

export default async function drone(event) {
    return [{
        ...options(event),
        hostname: process.env.DRONE_HOST ?? 'drone.dasred.de',
        path:     process.env.DRONE_PATH ?? '/hook',
    }];
}
