import {defaultDescriptor} from "../common/utils";
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
    })

    if (!client.authentications) {

        const defaultAuthenticationsObject = Object.create(Object.prototype, {
            addAuthentication: {
                ...defaultDescriptor,
                writable: false,
                enumerable: false,
                value: function addAuthentication(p = {}) {

                    const {name = "user"} = p;

                    const defaultAuthenticationObject = Object.create(Object.prototype, {
                        subscribeToUserResponsesForUpdateUser: {
                            ...defaultDescriptor,
                            value: function subscribeToUserResponsesForUpdateUser() {

                                if (wapp.states) {
                                    const statesHandleName = "subscribeFor" + name.slice(0, 1).toUpperCase() + name.slice(1);

                                    wapp.states.addHandle({
                                        [statesHandleName]: function (req, res, next) {

                                            const wappResponse = res.wappResponse;
                                            const wappRequest = req.wappRequest;

                                            if (client.authentications[name].unsubscribe){
                                                client.authentications[name].unsubscribe();
                                            }

                                            const unsubscribe = wappResponse.store.subscribe(function (state, {type, payload}) {

                                                if (type === "INS_RES" && payload.name === "responses"){

                                                    const keys = [name+"Login", name+"Logout", name+"Signup", name+"ResetPassword", name+"Save", name+"ChangeEmail", name + "EmailConfirmation"];
                                                    const stateBeforeUserId = state.req.user?._id;
                                                    const stateBeforeUser = state.req.user;
                                                    const response = payload.value;

                                                    keys.forEach(function (requestName) {
                                                        if (response && response[requestName] && typeof response[requestName].record !== "undefined" && !response[requestName].error){

                                                            const isLogout = (requestName === name+"Logout");

                                                            let userId = response[requestName].record?._id;
                                                            if (isLogout && userId) {
                                                                userId = null;
                                                            }

                                                            const changedUser = !(
                                                                (userId && stateBeforeUserId && stateBeforeUserId.toString() === userId.toString()) ||
                                                                (!userId && !stateBeforeUserId));

                                                            const changedData = (userId && !changedUser && JSON.stringify(stateBeforeUser) !== JSON.stringify(response[requestName].record));

                                                            if (changedUser || changedData) {

                                                                const newUser = (response[requestName].record?._id && !isLogout) ? {...response[requestName].record} : null;

                                                                wappResponse.store.dispatch(wapp.states.runAction("req", {
                                                                    name: "user",
                                                                    value: newUser
                                                                }))
                                                                wappResponse.state = wappResponse.store.getState();

                                                                wappRequest.user = newUser;
                                                                req.user = wappRequest.user;

                                                            }

                                                        }
                                                    })
                                                }
                                            })

                                            client.authentications[name].unsubscribe = function() {
                                                unsubscribe();
                                                client.authentications[name].unsubscribe = null;
                                            }

                                            next();

                                        }
                                    })
                                }
                            }
                        },
                        unsubscribe: {
                            ...defaultDescriptor,
                            value: null
                        },
                    })

                    Object.defineProperty(client.authentications, name, {
                        ...defaultDescriptor,
                        writable: false,
                        value: defaultAuthenticationObject
                    });

                    client.authentications[name].subscribeToUserResponsesForUpdateUser();

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
        })

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
