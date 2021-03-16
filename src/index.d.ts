declare module 'lib-service' {
    function getServiceFactory(
        globalConfig: Record<string, any>
    ): (
        config: Record<string, any>,
        options?: { interceptors?: Array<unknown> }
    ) => {
        [key: string]: (
            params: Record<string, any>
        ) => Promise<any>
    }

    export default getServiceFactory
}
