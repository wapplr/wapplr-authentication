import session from "express-session";
import connectMongo from "connect-mongo";
import cookieSignature from "cookie-signature";
import {defaultDescriptor} from "./utils";
import cookie from "cookie";

function getDefaultSessionMiddleware(p = {}) {

    const {mongooseConnection, cookieSecret, cookieName, cookieOptions} = p;

    const MongoStore = connectMongo(session);

    const sessionOptions = {
        store: new MongoStore({
            mongooseConnection: mongooseConnection,
        }),
        secret: cookieSecret,
        name: cookieName,
        resave: false,
        saveUninitialized: false
    };

    if (cookieOptions){
        sessionOptions.cookie = {
            ...cookieOptions
        }
    }

    const expressSessionMiddleware = session(sessionOptions);

    return async function sessionMiddleware(req, res, next){
        expressSessionMiddleware(req, res, async function () {
            await next();
        })
    }

}

export default function createSessionManager(p = {}) {

    const {
        getUser,
        cookieSecret,
        cookieName,
        cookieOptions,
        mongooseConnection,
        sessionMiddleware = getDefaultSessionMiddleware({mongooseConnection, cookieSecret, cookieName, cookieOptions}),
    } = p;

    const properties = {
        cookieSecret: {
            ...defaultDescriptor,
            enumerable: false,
            value: cookieSecret
        },
        cookieName: {
            ...defaultDescriptor,
            enumerable: false,
            value: cookieName
        },
        cookieOptions: {
            ...defaultDescriptor,
            enumerable: false,
            value: cookieOptions
        },
        getUser: {
            ...defaultDescriptor,
            enumerable: false,
            value: getUser || async function getUser({modelName, _id}){
                return null;
            }
        },
        mongooseConnection: {
            ...defaultDescriptor,
            enumerable: false,
            value: mongooseConnection
        },
        sessionMiddleware: {
            ...defaultDescriptor,
            enumerable: false,
            value: sessionMiddleware
        },
        populateItemMiddleware: {
            ...defaultDescriptor,
            enumerable: false,
            value: async function populateItemMiddleware(req, res, next) {
                const user = await sessionManager.getAuthedItem(req, getUser);
                if (!user) {
                    if (next) {
                        return next();
                    }
                    return null;
                }
                req.user = user;
                req.wappRequest.user = user;
                if (next) {
                    return next();
                }
                return user;
            }
        },
        getAuthedItem: {
            ...defaultDescriptor,
            enumerable: false,
            value: async function getAuthedItem(req) {
                const getUser = sessionManager.getUser;
                if (!req.session || !req.session.userId || !req.session.modelName) {
                    return;
                }
                let user;
                try {
                    user = await getUser({modelName: req.session.modelName, _id: req.session.userId});
                } catch (e) {
                    return;
                }
                if (!user) {
                    return;
                }
                return user;
            }
        },
        getSessionMiddleware: {
            ...defaultDescriptor,
            value: function getSessionMiddleware() {
                const sessionMiddleware = sessionManager.sessionMiddleware;
                const populateAuthedItemMiddleware = sessionManager.populateItemMiddleware;
                return [sessionMiddleware, populateAuthedItemMiddleware];
            }
        },
        startAuthedSession: {
            ...defaultDescriptor,
            value: function startAuthedSession(req, { userId, modelName }) {
                const cookieSecret = sessionManager.cookieSecret;
                return new Promise(function(resolve, reject) {
                        return req.session.regenerate(function(err) {
                            if (err) {
                                return reject(err);
                            }
                            req.session.modelName = modelName;
                            req.session.userId = userId;
                            resolve(cookieSignature.sign(req.session.id, cookieSecret));
                        })
                    }
                )
            }
        },
        endAuthedSession: {
            ...defaultDescriptor,
            value: function endAuthedSession(req, res) {
                return new Promise(function (resolve, reject) {
                    return req.session.destroy(function(err) {
                        req.user = null;
                        req.wappRequest.user = null;
                        res.setHeader("Set-Cookie", cookie.serialize(sessionManager.cookieName, String(""), { expires: new Date(1), path: "/" }));
                        if (err) {
                            return reject(err);
                        }
                        resolve({success: true});
                    })
                });
            }
        },
    }

    const sessionManager = Object.create(Object.prototype, properties)
    return sessionManager;

}
