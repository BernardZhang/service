/**
 * @file create services by config
 * @author zhangyou
 */
import { stringify } from 'query-string';
import jsonToFormData from 'json-form-data';
import checkStatus from './checkStatus';
import globalConfig from './config';


const { protocol, host } = window.location;

export const removeEmptyKey = (params = {}) => {
	for (const key in params) {
		if (typeof params[key] === 'undefined') {
			delete params[key];
		}
	}
	return params;
};

export const getFullUrl = url => {
	if (!/^http/i.test(url)) {
		url = `${protocol}//${host}${globalConfig.baseUrl}${url}`;
	}
	return url;
};

export const buildURL = (config, params = {}) => {
	let { url, method } = config;
    method = method || 'GET';

    url = getFullUrl(url);
    // 替换url中动态参数如: /users/{id} => /users/1
    url = url.replace(/{([^}]*)}/g, (str, key) => params[key]);
    // 替换url中动态参数如: /users/:id => /users/1
    url = url.replace(/\/:([^/]*)/g, (str, key) => `/${params[key]}`);
    console.log(url);

	if (method === 'GET') {
		url = new URL(url);
		url.search = new URLSearchParams(removeEmptyKey(params));
		return url.href;
    }

    return url;
};

/**
 * 给请求添加拦截器
 * @param {Promise} promise 请求promise实例
 * @param {Array} interceptors 拦截器数组
 * @param {String} url 当前请求的地址
 */
export const addInterceptors = (promise, interceptors, url) => {
	interceptors.forEach(interceptor => {
		if (interceptor instanceof Function) {
			promise = promise.then(interceptor);
		}
		if (Object.prototype.toString.call(interceptor) === '[object Object]') {
            Object.entries(interceptor).forEach(([urlPattern, fun]) => {
				if (new RegExp(urlPattern).test(url) && fun instanceof Function) {
					promise = promise.then(fun);
				}
			});
		}
	});
	return promise;
};

/**
 * 组装最终请求的options对象
 * 
 * @param {Object} options 请求配置信息对象
 * @params {Object} params 请求参数
 * 
 * @return {Object} 最终发送请求的options对象 
 */
export const generateOptions = (options, params) => {
    const {
        url,
        method = 'GET',
        ...rest
    } = options;
    const resultOptions = {
        credentials: 'include',
        method: method.toUpperCase()
    };
    const dataType = options.dataType || globalConfig.dataType;
    const formatBody = (options, params) => {
        if (params instanceof FormData) {
            return params;
        }

        if (dataType === 'json') {
            return JSON.stringify(params);
        }

        if (dataType === 'formdata') {
            return jsonToFormData(params);
            // const fd = new FormData();
            // Object.keys(params).map(key => {
            //     fd.append(key, params[key]);
            // });
            // return fd;
        }

        return stringify(params);
    };

    if (method.toUpperCase() !== 'GET') {
        if (dataType === 'json') {
            Object.assign(resultOptions, {
                headers: {
                    'Content-Type': 'application/json'
                },
                ...rest
            });
        }
        
        resultOptions.body = formatBody(resultOptions, params);
    }

    return resultOptions;
};

export const createServices = (config, options = {}) => {
    const services = {};
    const {
        redirectUrl,
        onError
    } = globalConfig;
	let {
		interceptors = []
	} = options;
	interceptors = interceptors instanceof Array ?  interceptors : [interceptors];

	for (const key in config) {
        const { url } = config[key];

		services[key] = params => {
			let promise = fetch(
                buildURL(config[key], params),
                generateOptions(config[key], params)
            ).then(res => checkStatus(res, globalConfig)).then(response => response.json instanceof Function ? response.json() : response);

			if (interceptors && interceptors.length) {
				promise = addInterceptors(promise, interceptors, url);
            }

			promise = promise.then((res = {}) => {
				if (!res.success && +res.status === 302) {
					location.href = redirectUrl;
                }
                if (res && res.success) {
                    return res.data;
                } else {
                    throw res;
                }
            }).finally(() => {
                const { errorHandle } = options;
                promise.catch(onError || errorHandle || (err => {
                    console.warn(`request ${url} exception`, err);
				    // message.error(err.message || '服务器未知错误');
				    return;
                }));
            });

            // 包装promise实例，重写then、catch方法，用来获取链式调用最后一个promise实例
			// 从而实现错误处理的链式冒泡处理机制
			const wrapePromise = () => {
				let pthen = promise.then;
				let pcatch = promise.catch;

				promise.then = (...args) => {
					promise = pthen.apply(promise, args);
					return wrapePromise();
				};

				promise.catch = (...args) => {
					promise = pcatch.apply(promise, args);
					return wrapePromise();
				};

				return promise;
			};
			promise = wrapePromise();
        
            return promise;
        };
        services[key].URL = new URL(getFullUrl(url));
	}

	return services;
};

export default config => {
    Object.assign(globalConfig, config);
    return createServices;
};
