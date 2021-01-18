import wapplrPostTypes from "wapplr-posttypes";
import getSession from "./getSession";
import getResolvers from "./getResolvers";
import {mergeProperties, defaultDescriptor, createAnAdmin} from "./utils";
import defaultMessages from "./defaultMessages";

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

                    const {name = "user", admin, ...rest} = p;

                    if (!wapp.server.postTypes){
                        wapplrPostTypes({wapp, name, ...rest});
                    }

                    const namePattern = /^.{1,30}$/;

                    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

                    const passwordPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,256}$/;

                    const postType = await wapp.server.postTypes.getPostType({
                        ...rest,
                        name: name,
                        addIfThereIsNot: true,
                        config: {
                            messages: defaultMessages,
                            ...(rest.config) ? rest.config : {},

                            schemaFields: {
                                name: {
                                    first: {
                                        type: String,
                                        wapplr: {
                                            pattern: namePattern,
                                            required: true
                                        }
                                    },
                                    last: {
                                        type: String,
                                        wapplr: {
                                            pattern: namePattern,
                                            private: "author"
                                        }
                                    }
                                },
                                email: {
                                    type: String,
                                    wapplr: {
                                        pattern: emailPattern,
                                        private: "author",
                                        required: true
                                    }
                                },
                                emailValidated: {
                                    type: Boolean,
                                    default: false,
                                    wapplr: {
                                        readOnly: true,
                                        private: "author"
                                    }
                                },
                                password: {
                                    type: String,
                                    wapplr: {
                                        pattern: passwordPattern,
                                        disabled: true
                                    }
                                },
                                passwordRecoveryKey: {
                                    type: String,
                                    wapplr: { disabled: true }
                                },
                                emailConfirmationKey: {
                                    type: String,
                                    wapplr: { disabled: true }
                                },
                                ...(rest.config && rest.config.schemaFields) ? rest.config.schemaFields : {}
                            },

                            requiredDataForStatus: {
                                name: {
                                    first: { type: String },
                                    last: { type: String }
                                },
                                email: { type: String },
                                emailValidated: { type: Boolean },
                                ...(rest.config && rest.config.requiredDataForStatus) ? rest.config.requiredDataForStatus : {}
                            },

                            resolvers: {
                                new: null
                            },

                        },
                    })

                    getResolvers({wapp, name, ...rest, ...postType});

                    const defaultAuthenticationObject = Object.create(Object.prototype, {
                        session: {
                            ...defaultDescriptor,
                            value: getSession({wapp, name, ...rest, ...postType})
                        },
                    })

                    mergeProperties(defaultAuthenticationObject, postType)

                    Object.defineProperty(server.authentications, name, {
                        ...defaultDescriptor,
                        writable: false,
                        value: defaultAuthenticationObject
                    });

                    createAnAdmin({...defaultAuthenticationObject, admin})

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

    return server.authentications;

}
