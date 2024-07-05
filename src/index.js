import https from 'https';

const HEADERS = ['Content-Type', 'X-GitHub-Delivery', 'X-GitHub-Event', 'X-GitHub-Hook-ID', 'X-GitHub-Hook-Installation-Target-ID', 'X-GitHub-Hook-Installation-Target-Type', 'X-Hub-Signature', 'X-Hub-Signature-256'];
const MAPPING = Object.entries({
    drone(event) {
        return [{
            ...this.options(event),
            hostname: process.env.GDC_DRONE_HOST ?? 'drone.dasred.de',
            path:     process.env.GDC_DRONE_PATH ?? '/hook',
        }];
    },
    portainer(event, path) {
        return [{
            ...this.options(event, path),
            hostname: process.env.GPC_PORTAINER_HOST ?? 'portainer.dasred.de',
            path:     (process.env.GPC_PORTAINER_PATH ?? '/api/stacks/webhooks/') + path.split('/').pop(),
        }];
    },

    options(event) {
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
});

function LOG(...args) {
    console.log(...args);
}

export const handler = async (event) => {
    LOG('EVENT', event);

    const helper = MAPPING.find(([path]) => event.path.startsWith('/' + path));
    if (helper === undefined) {
        LOG('ERROR', {statusCode: 405, message: 'Mapping not found'});
        return {statusCode: 405, message: 'Mapping not found'};
    }

    const results = await Promise.all(helper[1](event, event.path.substring(helper[0])).map((options, index) => {
        return new Promise((resolve) => {
            LOG(`REQUEST #${index}`, options);

            const request = https.request(options,
                /** @param {IncomingMessage} response */
                (response) => {
                    let body = '';
                    response.setEncoding('utf8');
                    response.on('data', (chunk) => body += chunk);
                    response.on('end', () => {
                        LOG(`RESPONSE #${index}`, {
                            statusCode:    response.statusCode || 500,
                            statusMessage: response.statusMessage,
                            body:          body,
                            headers:       response.rawHeaders
                        });

                        if (response.status >= 400) {
                            return resolve({
                                statusCode: response.statusCode || 500,
                                body:       body,
                            });
                        }

                        resolve({statusCode: 204});
                    });
                }
            );
            request.write(event.body);
            request.end();
        });
    }));

    const resultFailed = results.find(({statusCode}) => statusCode !== 204);
    if (resultFailed) {
        return resultFailed;
    }

    return {statusCode: 204};
};
