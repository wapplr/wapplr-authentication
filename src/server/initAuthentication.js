import wapplrPostTypes from "wapplr-posttypes";
import getSession from "./getSession";
import getResolvers from "./getResolvers";
import {mergeProperties, defaultDescriptor, createAnAdmin} from "./utils";
import addStatesHandle from "./addStatesHandle";
import getConstants from "./getConstants";
import {capitalize} from "../common/utils";

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

                    const {name = "user", config = {}} = p;

                    if (!wapp.server.postTypes){
                        wapplrPostTypes({wapp, name});
                    }

                    const defaultConstants = getConstants(p);

                    const {
                        admin,
                        messages = defaultConstants.messages,
                        labels = defaultConstants.labels,
                        ...rest
                    } = config;

                    const namePattern = /^.{1,30}$/;
                    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
                    const passwordPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,256}$/;

                    const postType = await wapp.server.postTypes.getPostType({
                        name: name,
                        addIfThereIsNot: true,
                        config: {

                            ...rest,

                            authorModelName: capitalize(name),

                            messages: messages,
                            labels: labels,

                            schemaFields: {
                                email: {
                                    type: String,
                                    unique: true,
                                    wapplr: {
                                        pattern: emailPattern,
                                        validationMessage: messages.validationEmail,
                                        private: "author",
                                        readOnly: true,
                                        formData: {
                                            label: labels.email
                                        }
                                    }
                                },
                                emailConfirmed: {
                                    type: Boolean,
                                    default: false,
                                    wapplr: {
                                        private: "author",
                                        readOnly: true,
                                    }
                                },
                                password: {
                                    type: String,
                                    wapplr: {
                                        pattern: passwordPattern,
                                        validationMessage: messages.validationPassword,
                                        disabled: true,
                                        formData: {
                                            label: labels.password,
                                            type: "password"
                                        }
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
                                name: {
                                    first: {
                                        type: String,
                                        wapplr: {
                                            pattern: namePattern,
                                            validationMessage: messages.validationName,
                                            required: true,
                                            formData: {
                                                label: labels.firstName
                                            }
                                        }
                                    },
                                    last: {
                                        type: String,
                                        wapplr: {
                                            pattern: namePattern,
                                            validationMessage: messages.validationName,
                                            private: "author",
                                            formData: {
                                                label: labels.lastName
                                            }
                                        }
                                    }
                                },
                                ...(rest.schemaFields) ? rest.schemaFields : {}
                            },
                            setSchemaMiddleware: function (p) {

                                const {schema, statusManager} = p;

                                schema.virtualToGraphQl({
                                    name: "title",
                                    get: function () {
                                        return this.name?.first || null
                                    },
                                    options: {
                                        instance: "String",
                                        wapplr: {
                                            finalDataFilter: function ({record, value, isAuthorOrAdmin}) {
                                                if (isAuthorOrAdmin && record){
                                                    return (record.name) ? record.name.last ? record.name.first + " " + record.name.last : record.name.first : null
                                                }
                                                return value;
                                            },
                                            listData: {
                                                list: {
                                                    show: "content"
                                                }
                                            }
                                        }
                                    }
                                });

                                schema.pre("save", async function(next) {
                                    const userId = this._id;
                                    const status = this._status;
                                    const waitForSave = [];
                                    if (this.isModified("_status")){
                                        this._author_status = status;
                                        const dbs = wapp.server.database;
                                        const postTypes = wapp.server.postTypes?.postTypes || {};
                                        await Promise.all(Object.keys(dbs).map(async function (key) {
                                            const db = dbs[key];
                                            const models = db.models;
                                            return await Promise.all(Object.keys(models).map(async function (modelName) {
                                                const model = models[modelName];
                                                const posts = await model.find({_author: userId});
                                                const foundPostTypeName = Object.keys(postTypes).find((postTypeName)=>postTypes[postTypeName].Model === model);
                                                const postStatusManager = foundPostTypeName ? postTypes[foundPostTypeName].statusManager : null;
                                                waitForSave.push(...posts.map((post)=>{return {post, statusManager: postStatusManager || statusManager}}));
                                            }))
                                        }))
                                    }

                                    if (waitForSave.length){
                                        let i = -1;
                                        async function nextSave() {
                                            i = i + 1;
                                            if (waitForSave[i]){
                                                const {post, /*statusManager*/} = waitForSave[i];
                                                if (post._id.toString() === userId.toString()){
                                                    return await nextSave();
                                                }
                                                post._author_status = status;
                                                await post.save();
                                                await nextSave();
                                            } else {
                                                await next();
                                            }
                                        }

                                        await nextSave();

                                    } else {
                                        await next();
                                    }
                                });

                                if (rest.setSchemaMiddleware) {
                                    rest.setSchemaMiddleware(p);
                                }
                            },
                            requiredDataForStatus: {
                                name: {
                                    first: { type: String },
                                },
                                email: { type: String },
                                emailConfirmed: { type: Boolean, value: true },
                                ...(rest && rest.requiredDataForStatus) ? rest.requiredDataForStatus : {}
                            },
                            resolvers: {
                                new: null,
                                ...(rest && rest.postTypeResolvers) ? rest.postTypeResolvers : {}
                            },
                        },
                    });

                    getResolvers({wapp, name, config: {...rest, Model: postType.Model, statusManager: postType.statusManager, database: postType.database}});

                    const defaultAuthenticationObject = Object.create(Object.prototype, {
                        session: {
                            ...defaultDescriptor,
                            value: getSession({wapp, name, config: {...rest, database: postType.database}})
                        },
                    });

                    mergeProperties(defaultAuthenticationObject, postType);

                    Object.defineProperty(server.authentications, name, {
                        ...defaultDescriptor,
                        writable: false,
                        value: defaultAuthenticationObject
                    });

                    if (admin) {
                        await createAnAdmin({...defaultAuthenticationObject, admin});
                    }

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
        });

        addStatesHandle({wapp});

        Object.defineProperty(server, "authentications", {
            ...defaultDescriptor,
            writable: false,
            value: defaultAuthenticationsObject
        });

        Object.defineProperty(server.authentications, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    }

    return server.authentications;

}
