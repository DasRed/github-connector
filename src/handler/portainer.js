import options from '../options.js';


class Portainer {
    /**
     *
     * @param {string} host
     * @param {string} token
     */
    constructor(host, token) {
        this.host  = host;
        this.token = token;
    }

    async createRequestOptions(event) {
        const webhookIds = await this.requestWebhookIds();

        return webhookIds.map((webhookId) => {
            return {
                ...options(event),
                hostname: this.host,
                path:     '/api/stacks/webhooks/' + webhookId,
            };
        });
    }

    async requestWebhookIds() {
        const response = await fetch(`https://${this.host}/api/stacks`, {
            headers: {
                'X-API-Key': this.token,
                Accept:      'application/json'
            }
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();

        return data.filter((stack) => stack.AutoUpdate?.Webhook).map((stack) => stack.AutoUpdate?.Webhook);
    }
}


export default (event) => (new Portainer(process.env.PORTAINER_HOST ?? 'portainer.dasred.de', process.env.PORTAINER_TOKEN)).createRequestOptions(event);
