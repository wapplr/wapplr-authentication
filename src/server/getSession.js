import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import createSessionManager from "./sessionManager";
import {defaultDescriptor} from "./utils";

export default function getSession(p = {}) {

    const {wapp, database, config = {}} = p;

    const globals = wapp.globals;
    const {DEV} = globals;

    const server = wapp.server;
    const {app} = server;

    const {
        cookieSecret = "yourHash",
        cookieOptions = {secure: "auto", signed: true, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000},
        cookieName = "wapplr.uid",
        getUser = async function({modelName, _id}) {

            const Model = database.models[modelName];
            if (!Model) {
                return null;
            }
            let user;
            try {
                user = await Model.findOne({"_id": _id}).exec();
            } catch (e) {}
            if (!user) {
                return null;
            }

            return {
                ...(user.toObject) ? user.toObject() : user
            };
        },
        disableUseSessionMiddleware,
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
