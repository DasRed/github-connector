import HEADERS from './headers.js';

export default function options(event) {
    return {
        port:               443,
        method:             event.httpMethod,
        rejectUnauthorized: false,
        family:             6,
        headers:            HEADERS.reduce(
            (acc, name) => {
                if (event.headers[name]) {
                    acc[name] = event.headers[name]
                }
                return acc;
            },
            {'accept': '*/*'}
        ),
    }
}