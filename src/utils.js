export const removeEmptyKey = (params = {}) => {
	for (const key in params) {
		if (typeof params[key] === 'undefined') {
			delete params[key];
		}
	}
	return params;
};

export const getFullUrl = (url, baseUrl = '')  => {
    const { protocol, host } = window.location;

	if (!/^http/i.test(url)) {
		url = `${protocol}//${host}${baseUrl}${url}`;
	}
	return url;
};

export const buildURL = (config, params = {}, baseUrl = "") => {
	let { url, method } = config;
    method = method || 'GET';

    url = getFullUrl(url, baseUrl);
    // 替换url中动态参数如: /users/{id} => /users/1
    url = url.replace(/{([^}]*)}/g, (str, key) => {
		if (typeof params[key] === 'object') {
			return JSON.stringify(params[key]);
		}

		return params[key];
	});
    // 替换url中动态参数如: /users/:id => /users/1
    url = url.replace(/\/:([^/]*)/g, (str, key) => `/${params[key]}`);

	if (method === 'GET') {
		url = new URL(url);
		url.search = new URLSearchParams(removeEmptyKey(params));
		return url.href;
    }

    return url;
};
