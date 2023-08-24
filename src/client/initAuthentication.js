import {defaultDescriptor, mergeProperties} from "../common/utils";
import addStatesHandle from "./addStatesHandle";

export default function initAuthentication(p = {}) {

    const {wapp} = p;
    const client = wapp.client;

    let lastRequest = null;

    wapp.middleware.addHandle({
        user: function (req, res, next) {
            if (lastRequest?.user?._id){
                req.wappRequest.user = lastRequest.user;
                req.user = req.wappRequest.user;
            }
            lastRequest = req.wappRequest;
            next()
        }
    });

    if (!client.authentications) {

        const defaultAuthenticationsObject = Object.create(Object.prototype, {
            addAuthentication: {
                ...defaultDescriptor,
                writable: false,
                enumerable: false,
                value: function addAuthentication(p = {}) {

                    const {name = "user", ...rest} = p;

                    const postType = wapp.client.postTypes.getPostType({
                        ...rest,
                        name: name,
                        addIfThereIsNot: true,
                        config: {
                            requiredDataForStatus: {
                                name: {
                                    first: { type: String },
                                },
                                email: { type: String },
                                emailConfirmed: { type: Boolean, value: true },
                                ...(rest.config && rest.config.requiredDataForStatus) ? rest.config.requiredDataForStatus : {}
                            },
                        }
                    });

                    const defaultAuthenticationObject = Object.create(Object.prototype, {
                        subscribeUpdateUser: {
                            ...defaultDescriptor,
                            value: function subscribeUpdateUser() {

                                if (wapp.states) {
                                    const statesHandleName = "subscribeFor" + name.slice(0, 1).toUpperCase() + name.slice(1);

                                    wapp.states.addHandle({
                                        [statesHandleName]: function (req, res, next) {

                                            const wappResponse = res.wappResponse;
                                            const wappRequest = req.wappRequest;

                                            if (client.authentications[name].unsubscribeUpdateUser){
                                                client.authentications[name].unsubscribeUpdateUser();
                                            }

                                            const unsubscribe = wappResponse.store.subscribe(function ({type, payload}) {

                                                if (type === "INS_RES" && payload.name === "responses"){

                                                    const keys = [name+"Login", name+"Logout", name+"Signup", name+"ResetPassword", name+"Save", name+"ChangeEmail", name + "EmailConfirmation", name+"Delete"];
                                                    const stateBeforeUserId = wappResponse.store.getState("req.user._id");
                                                    const stateBeforeUser = wappResponse.store.getState("req.user");
                                                    const response = payload.value;
                                                    const findByIdBeforeUpdate = wappResponse.store.getState("res.responses."+name+"FindById");

                                                    keys.forEach(function (requestName) {
                                                        if (response && response[requestName] && typeof response[requestName].record !== "undefined" && !response[requestName].error){

                                                            let userId = response[requestName].record?._id;

                                                            const isLogout = (
                                                                requestName === name+"Logout" ||
                                                                (requestName === name+"Delete" && userId && stateBeforeUserId && stateBeforeUserId.toString() === userId.toString())
                                                            );

                                                            const shouldUpdateFindById = (findByIdBeforeUpdate?._id === userId);
                                                            if (isLogout && userId) {
                                                                userId = null;
                                                            }

                                                            let changedUser = !(
                                                                (userId && stateBeforeUserId && stateBeforeUserId.toString() === userId.toString()) ||
                                                                (!userId && !stateBeforeUserId));

                                                            const changedData = (userId && !changedUser && JSON.stringify(stateBeforeUser) !== JSON.stringify(response[requestName].record));

                                                            const possibleRequestsByAdmin = [name+"Save", name+"Delete"];
                                                            if (changedUser && stateBeforeUserId && userId && possibleRequestsByAdmin.indexOf(requestName) > -1) {
                                                                changedUser = false;
                                                            }

                                                            if (changedUser || changedData) {

                                                                const newUser = (response[requestName].record?._id && !isLogout) ? {...response[requestName].record} : null;

                                                                wappResponse.store.dispatch(wapp.states.runAction("req", {
                                                                    name: "user",
                                                                    value: newUser
                                                                }));

                                                                if (shouldUpdateFindById){
                                                                    wappResponse.store.dispatch(wapp.states.stateManager.actions.res({
                                                                        type: "INS_RES",
                                                                        name: "responses",
                                                                        value: {[name+"FindById"]: newUser}
                                                                    }));
                                                                }

                                                                wappRequest.user = newUser;
                                                                req.user = wappRequest.user;

                                                            }

                                                        }
                                                    })
                                                }
                                            });

                                            client.authentications[name].unsubscribeUpdateUser = function() {
                                                unsubscribe();
                                                client.authentications[name].unsubscribeUpdateUser = null;
                                            };

                                            next();

                                        }
                                    })
                                }
                            }
                        },
                        unsubscribeUpdateUser: {
                            ...defaultDescriptor,
                            value: null
                        },
                    });

                    mergeProperties(defaultAuthenticationObject, postType);

                    Object.defineProperty(client.authentications, name, {
                        ...defaultDescriptor,
                        writable: false,
                        value: defaultAuthenticationObject
                    });

                    client.authentications[name].subscribeUpdateUser();

                    return client.authentications[name];

                }
            },
            getAuthentication: {
                ...defaultDescriptor,
                writable: false,
                enumerable: false,
                value: function getAuthentication(p = {}) {
                    const {name = "user", addIfThereIsNot, ...rest} = p;
                    const auth = client.authentications[name];
                    if (auth || !addIfThereIsNot){
                        return auth;
                    }
                    return client.authentications.addAuthentication({name, ...rest});
                }
            },
        });

        Object.defineProperty(client, "authentications", {
            ...defaultDescriptor,
            writable: false,
            value: defaultAuthenticationsObject
        });

        Object.defineProperty(client.authentications, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

        addStatesHandle({wapp});

    }

    return client.authentications;

}
