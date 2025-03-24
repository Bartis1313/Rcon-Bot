// for new node

class Fetch {
    static async post(url, parameters, rawReturn = false, customHeaders = {}) {
        const controller = new AbortController();
        const timeout = 5_000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Charset": "utf-8",
            ...customHeaders
        };
        
        return fetch(url, {
            method: 'POST',
            headers,
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
    
    static async get(url, parameters = {}, rawReturn = false, customHeaders = {}) {
        const queryString = new URLSearchParams(parameters).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        const controller = new AbortController();
        const timeout = 5_000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const headers = {
            "Accept": "application/json",
            "Accept-Charset": "utf-8",
            ...customHeaders
        };
        
        return fetch(fullUrl, {
            method: 'GET',
            headers,
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
    
    static async withApiKey(apiKey) {
        return {
            get: (url, parameters = {}, rawReturn = false) => {
                return Fetch.get(url, parameters, rawReturn, { "X-API-Key": apiKey });
            },
            post: (url, parameters, rawReturn = false) => {
                return Fetch.post(url, parameters, rawReturn, { "X-API-Key": apiKey });
            }
        };
    }
}

export default Fetch;