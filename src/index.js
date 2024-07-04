import https from 'https';

const MAPPING = Object.entries({
    drone() {
        return {
            hostname: process.env.GDC_DRONE_HOST ?? 'drone.dasred.de',
            path:     process.env.GDC_DRONE_PATH ?? '/hook',
            //headers:  {
            //    'X-Hub-Signature':     event.headers['X-Hub-Signature'],
            //    'X-Hub-Signature-256': event.headers['X-Hub-Signature-256'],
            //}
        };
    },
    portainer(event, path) {
        return {
            hostname: process.env.GPC_PORTAINER_HOST ?? 'portainer.dasred.de',
            path:     (process.env.GPC_PORTAINER_PATH ?? '/api/stacks/webhooks') + path,
        };
    }
});

export const handler = (event) => {
    return new Promise((resolve, reject) => {
        console.log(event);

        const helper = MAPPING.find(([path]) => event.path.startsWith('/' + path));
        if (helper === undefined) {
            resolve({statusCode: 405, message: 'Mapping not found'});
            return;
        }
        const result = helper[1](event, event.path.substring(helper[0]));

        const request = https.request(
            {
                ...result,
                port:               443,
                method:             event.httpMethod,
                rejectUnauthorized: false,
                family:             6,
                headers:            {
                    'accept':                                 '*/*',
                    'Content-Type':                           event.headers['Content-Type'],
                    'X-GitHub-Delivery':                      event.headers['X-GitHub-Delivery'],
                    'X-GitHub-Event':                         event.headers['X-GitHub-Event'],
                    'X-GitHub-Hook-ID':                       event.headers['X-GitHub-Hook-ID'],
                    'X-GitHub-Hook-Installation-Target-ID':   event.headers['X-GitHub-Hook-Installation-Target-ID'],
                    'X-GitHub-Hook-Installation-Target-Type': event.headers['X-GitHub-Hook-Installation-Target-Type'],
                    'X-Hub-Signature':                        event.headers['X-Hub-Signature'] ?? undefined,
                    'X-Hub-Signature-256':                    event.headers['X-Hub-Signature-256'] ?? undefined,
                }
            },
            (response) => {
                let body = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => body += chunk);
                response.on('end', () => {
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
