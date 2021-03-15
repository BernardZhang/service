declare module 'lib-service' {
    function getServiceFactory(
        globalConfig: Record<string, any>
    ): {
        [key: string]: (
            config: Record<string, any>,
            options: Record<string, any>
        ) => Promise
    }

    export default getServiceFactory
}
