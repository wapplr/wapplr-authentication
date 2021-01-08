import wapplrPostTypes from "wapplr-posttypes";
import getSession from "./getSession";
import getApi from "./getApi";
import {mergeProperties, defaultDescriptor} from "./utils";

export default function initAuthentication(p = {}) {

    const {wapp} = p;
    const server = wapp.server;

    if (!server.authentications) {

        const defaultAuthenticationsObject = Object.create(Object.prototype, {
            addAuthentication: {
                ...defaultDescriptor,
                writable: false,
                enumerable: false,
                value: async function addAuthentication(p = {}) {

                    const {name = "user", ...rest} = p;

                    if (!wapp.server.postTypes){
                        wapplrPostTypes({wapp, name, ...rest});
                    }

                    const postType = await wapp.server.postTypes.getPostType({
                        ...rest,
                        name: name,
                        addIfThereIsNot: true,
                    })

                    const defaultAuthenticationObject = Object.create(Object.prototype, {
                        session: {
                            ...defaultDescriptor,
                            value: getSession({wapp, ...p, ...postType})
                        },
                        api: {
                            ...defaultDescriptor,
                            value: getApi({wapp, ...p, ...postType})
                        },
                    })

                    mergeProperties(defaultAuthenticationObject, postType)

                    Object.defineProperty(server.authentications, name, {
                        ...defaultDescriptor,
                        writable: false,
                        value: defaultAuthenticationObject
                    });

                    return server.authentications[name];

                }
            },
            getAuthentication: {
                ...defaultDescriptor,
                writable: false,
                enumerable: false,
                value: async function getAuthentication(p = {}) {
                    const {name = "user", addIfThereIsNot, ...rest} = p;
                    const auth = server.authentications[name];
                    if (auth || !addIfThereIsNot){
                        return auth;
                    }
                    return await server.authentications.addAuthentication({name, ...rest});
                }
            },
        })

        Object.defineProperty(server, "authentications", {
            ...defaultDescriptor,
            writable: false,
            value: defaultAuthenticationsObject
        });

    }

}
