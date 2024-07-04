import https from 'https';

const HEADERS = ['Content-Type', 'X-GitHub-Delivery', 'X-GitHub-Event', 'X-GitHub-Hook-ID', 'X-GitHub-Hook-Installation-Target-ID', 'X-GitHub-Hook-Installation-Target-Type', 'X-Hub-Signature', 'X-Hub-Signature-256'];
const MAPPING = Object.entries({
    drone() {
        return {
            hostname: process.env.GDC_DRONE_HOST ?? 'drone.dasred.de',
            path:     process.env.GDC_DRONE_PATH ?? '/hook',
        };
    },
    portainer(event, path) {
        return {
            hostname: process.env.GPC_PORTAINER_HOST ?? 'portainer.dasred.de',
            path:     (process.env.GPC_PORTAINER_PATH ?? '/api/stacks/webhooks') + path.split('/').pop(),
        };
    }
});

export const handler = (event) => {
    return new Promise((resolve, reject) => {
        console.log('REQUEST', event);

        const helper = MAPPING.find(([path]) => event.path.startsWith('/' + path));
        if (helper === undefined) {
            resolve({statusCode: 405, message: 'Mapping not found'});
            return;
        }

        const request = https.request(
            {
                ...helper[1](event, event.path.substring(helper[0])),
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
            },
            (response) => {
                let body = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => body += chunk);
                response.on('end', () => {
                    console.log('RESPONSE', response);
                    if (response.status >= 400) {
                        return reject({
                            statusCode: response.statusCode || 500,
                            body:       body,
                        });
                    }

                    resolve({statusCode: 200});
                });
            }
        );
        request.write(event.body);
        request.end();
    });
};
