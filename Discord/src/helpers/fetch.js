// for new node

class Fetch {
    static async post(url, parameters, rawReturn = false) {
        const controller = new AbortController();
        const timeout = 5_000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        return fetch(url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            },
            body: JSON.stringify(parameters),
            signal: controller.signal
        })
            .then(async response => {
                clearTimeout(timeoutId);

                if (rawReturn)
                    return response;

                return await response.json();
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    throw new Error(`Request timed out after ${timeout}ms`);
                }
                throw error;
            });
    }
    static async get(url, parameters = {}, rawReturn = false) {
        const queryString = new URLSearchParams(parameters).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;

        const controller = new AbortController();
        const timeout = 5_000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        return fetch(fullUrl, {
            method: 'GET',
            headers: {
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            },
            signal: controller.signal
        })
            .then(async response => {
                clearTimeout(timeoutId);

                if (rawReturn)
                    return response;

                return await response.json();
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    throw new Error(`Request timed out after ${timeout}ms`);
                }
                throw error;
            });
    }
}

export default Fetch;
