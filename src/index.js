import https from 'https';
import drone from './handler/drone.js';
import portainer from './handler/portainer.js';
import LOG from './log.js';

const MAPPING = [
    {path: 'drone', callback: drone},
    {path: 'portainer', callback: portainer},
];

export const handler = async (event) => {
    LOG('EVENT', event);

    const helper = MAPPING.find(({path}) => event.path.startsWith('/' + path));
    if (helper === undefined) {
        LOG('ERROR', {statusCode: 405, message: 'Mapping not found'});
        return {statusCode: 405, message: 'Mapping not found'};
    }

    const requestOptions = await helper.callback(event);

    const results = await Promise.all(requestOptions.map((options, index) => {
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

                        resolve({statusCode: 200});
                    });
                }
            );
            request.write(event.body);
            request.end();
        });
    }));

    const resultFailed = results.find(({statusCode}) => statusCode !== 200);
    if (resultFailed) {
        return resultFailed;
    }

    return {statusCode: 200};
};
