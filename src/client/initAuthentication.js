import {defaultDescriptor} from "../common/utils";
import addStatesHandle from "../common/addStatesHandle";

export default function initAuthentication(p = {}) {

    const {wapp} = p;
    const client = wapp.client;

    if (!wapp._originalResetRequest){
        Object.defineProperty(wapp, "_originalResetRequest", {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: wapp.resetRequest
        })
    }

    wapp.resetRequest = function (...attributes) {
        let lastUser = wapp.request.user;
        wapp._originalResetRequest(...attributes);
        wapp.request.user = lastUser;
    }

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

                                            if (!client.authentications[name].unsubscribe) {

                                                const unsubscribe = wapp.states.store.subscribe(function (state, {type, payload}) {
                                                    if (type === "INS_RES" && payload.name === "responses"){

                                                        const keys = [name+"Login", name+"Logout", name+"Signup"];
                                                        const stateBeforeUserId = state.req.user?._id;
                                                        const response = payload.value;

                                                        keys.forEach(function (requestName) {
                                                            if (response && response[requestName] && typeof response[requestName].record !== "undefined"){

                                                                const isLogout = (requestName === name+"Logout");

                                                                let userId = response[requestName].record?._id;
                                                                if (isLogout && userId) {
                                                                    userId = null;
                                                                }

                                                                const changed = !((userId && stateBeforeUserId && stateBeforeUserId.toString() === userId.toString()) || (!userId && !stateBeforeUserId));

                                                                if (changed) {
                                                                    const newUser = (response[requestName].record?._id && !isLogout) ? {...response[requestName].record} : null;
                                                                    wapp.states.store.dispatch(wapp.states.runAction("req", {
                                                                        name: "user",
                                                                        value: newUser
                                                                    }))
                                                                    wapp.response.state = wapp.states.store.getState();
                                                                    wapp.request.user = newUser;
                                                                    wapp.request.req.user = newUser;
                                                                }

                                                            }
                                                        })
                                                    }
                                                })

                                                client.authentications[name].unsubscribe = function() {
                                                    unsubscribe();
                                                    client.authentications[name].unsubscribe = null;
                                                }

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
