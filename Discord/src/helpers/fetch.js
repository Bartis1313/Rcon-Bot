// for new node

class Fetch {
    static async post(url, parameters, rawReturn = false) {
        return fetch(url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            },
            body: JSON.stringify(parameters)
        })
            .then(async response => {
                if (rawReturn)
                    return response;

                return await response.json();
            })
            .catch(error => {
                //console.error(error);
                throw error;
            });
    }
    static async get(url, parameters = {}, rawReturn = false) {
        const queryString = new URLSearchParams(parameters).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;

        return fetch(fullUrl, {
            method: 'GET',
            headers: {
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            }
        })
            .then(async response => {
                if (rawReturn)
                    return response;

                return await response.json();
            })
            .catch(error => {
                throw error;
            });
    }
}

export default Fetch;
