import { HTTP, IRequestContext, IResponseBodyType, RESPONSE_BODY_TYPE } from '@chained/http';

const createPromise = <T = void>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return { promise, resolve, reject };
};

type wxRequestResponse = Parameters<WechatMiniprogram.RequestSuccessCallback<any>>[0] & { url: string };

export default class Request<Body extends object | void = void, BodyDataKey extends string = ''> extends HTTP<
  wxRequestResponse,
  Body,
  BodyDataKey
> {
  protected core(requestContext: IRequestContext) {
    const request = requestContext.request;
    const params = {
      url: request.url,
      data: request.body,
      timeout: 60000,
      method: request.method,
      dataType: '其他',
      responseType:
        request.bodyType === RESPONSE_BODY_TYPE.arrayBuffer ? RESPONSE_BODY_TYPE.arrayBuffer : RESPONSE_BODY_TYPE.text
    } as Parameters<typeof wx.request>[0];
    if (request.headers) {
      const headers = {} as Exclude<typeof params.header, undefined>;
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });
      params.header = headers;
    }
    const { promise, resolve, reject } = createPromise<wxRequestResponse>();
    params.success = result => {
      resolve(Object.assign(result, { url: request.url }));
    };
    params.fail = errMsg => reject(errMsg);
    const task = wx.request(params);

    if (request.signal) {
      request.signal.addEventListener('abort', () => {
        task.abort();
      });
    }

    return promise;
  }

  protected async transform<B>(response: wxRequestResponse, bodyType: RESPONSE_BODY_TYPE) {
    let body: IResponseBodyType<B>;

    switch (bodyType) {
      case RESPONSE_BODY_TYPE.text:
        body = response.data;
        break;
      case RESPONSE_BODY_TYPE.json:
        body = JSON.parse(response.data);
        break;
      case RESPONSE_BODY_TYPE.arrayBuffer:
        body = response.data;
        break;
      default:
        throw new Error(`未处理的返回类型：${bodyType}`);
    }

    const headers = new Headers();
    if (typeof response.header === 'object') {
      for (const key in response.header) {
        if (Object.prototype.hasOwnProperty.call(response.header, key)) {
          const value = response.header[key];
          headers.set(key, value);
        }
      }
    }

    return {
      response: {
        headers: headers,
        redirected: response.profile ? !!response.profile.redirectStart : false,
        status: response.statusCode,
        statusText: response.errMsg,
        type: 'basic' as any,
        url: response.url
      },
      body
    };
  }
}
