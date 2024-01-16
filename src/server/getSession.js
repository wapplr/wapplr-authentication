import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import createSessionManager from "./sessionManager";
import {defaultDescriptor} from "./utils";
import {deCapitalize} from "../common/utils";

export default function getSession(p = {}) {

    const {wapp, config = {}} = p;

    const globals = wapp.globals;
    const {DEV} = globals;

    const server = wapp.server;
    const {app} = server;

    const {
        database,
        cookieSecret = "yourHash",
        cookieOptions = {secure: "auto", signed: true, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000},
        cookieName = "wapplr.uid",
        disableUseSessionMiddleware,
    } = config;

    const {
        getUser = async function({modelName, _id}) {

            const Model = database.models[modelName];
            if (!Model) {
                return null;
            }
            let user;

            try {
                const populateProperties = (config.schemaFields) ? Object.keys(config.schemaFields).filter((key)=>config.schemaFields[key].ref).map((key)=>key) : [];
                user = Model.findOne({"_id": _id});
                populateProperties.forEach((key)=>{

                    const required = config.schemaFields[key]?.required || config.schemaFields[key]?.wapplr?.required;
                    const isAdmin = user._status_isFeatured;

                    const ref = config.schemaFields[key].ref;
                    const postType = wapp.server.postTypes.postTypes[deCapitalize(ref)];

                    user = user.populate({
                        path: key,
                        ...(required && isAdmin) ? {} : {
                            match: {
                                _status: {$gt: postType.statusManager.statuses["created"] - 1},
                                _author_status: {$gt: postType.authorStatusManager.statuses["created"] - 1},
                            }
                        }
                    });
                });

                user = await user;

            } catch (e) {}
            if (!user) {
                return null;
            }

            return {
                ...(user.toObject) ? user.toObject() : user
            };
        },
    } = config;

    const session = server.session || config.session || createSessionManager({
        cookieSecret,
        cookieOptions,
        cookieName,
        getUser,
        mongooseConnection: database.connection
    });

    if (!server.session) {

        if (!server.session && !config.session) {

            if (!wapp.server.initializedCookieParser) {
                app.use(cookieParser(cookieSecret));
                Object.defineProperty(wapp.server, "initializedCookieParser", {
                    enumerable: false,
                    writable: false,
                    configurable: false,
                    value: true
                })
            }

            if (!wapp.server.initializedBodyParser){
                app.use(bodyParser.urlencoded({extended: true}));
                app.use(bodyParser.json());
                Object.defineProperty(wapp.server, "initializedBodyParser", {
                    enumerable: false,
                    writable: false,
                    configurable: false,
                    value: true
                })
            }

            if ((!DEV && cookieOptions.secure === "auto") || cookieOptions.secure === true) {
                if (app.set) {
                    app.set('trust proxy', 1);
                }
            }

            if (!disableUseSessionMiddleware) {
                app.use(session.getSessionMiddleware());
            }

        }

        if (!Object.hasOwnProperty("session")){
            Object.defineProperty(server, "session", {
                ...defaultDescriptor,
                value: session
            });
        }

    }

    server.session = session;

    return server.session;

}
