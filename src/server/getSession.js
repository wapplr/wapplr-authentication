import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import createSessionManager from "./sessionManager";
import {defaultDescriptor} from "./utils";

export default function getSession(p = {}) {

    const {wapp = {}, database} = p;

    const globals = wapp.globals;
    const {DEV} = globals;

    const server = wapp.server;
    const {app} = server;

    const globalConfig = (server.settings && server.settings.sessionConfig) ? server.settings.sessionConfig : {};
    const config = (p.config) ? {...globalConfig, ...p.config} : {...globalConfig};

    const {
        cookieSecret = "foo",
        cookieOptions = {secure: "auto", signed: true, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000},
        cookieName = "wapplr.uid",
        getUser = async function({modelName, id}) {

            const Model = database.models[modelName];
            if (!Model) {
                return null;
            }
            let user;
            try {user = await Model.findOne({"_id": id}).exec();} catch (e) {}
            if (!user) {
                return null;
            }

            const r = {
                ...user._doc,
                id: user._doc._id,
            };

            delete r._id;
            delete r.__v;
            return r;
        },
    } = config;

    const session = server.session || config.session || createSessionManager({
        cookieSecret,
        cookieOptions,
        cookieName,
        getUser,
        mongooseConnection: database.connection
    })

    if (!server.session) {

        if (!server.session && !config.session) {

            app.use(cookieParser(cookieSecret));
            app.use(bodyParser.urlencoded({extended: true}));
            app.use(bodyParser.json());
            if ((!DEV && cookieOptions.secure === "auto") || cookieOptions.secure === true) {
                if (app.set) {
                    app.set('trust proxy', 1);
                }
            }
            app.use(session.getSessionMiddleware());

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
