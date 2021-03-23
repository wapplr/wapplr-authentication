import wapplrClient from "wapplr";
import initAuthentication from "./initAuthentication";

export default function createClient(p) {
    const wapp = p.wapp || wapplrClient({...p});
    return initAuthentication({wapp, ...p});
}

export function createMiddleware(p = {}) {
    return function initAuthenticationMiddleware(req, res, next) {
        const wapp = req.wapp || p.wapp || createClient(p).wapp;
        initAuthentication({wapp, ...p});
        next();
    }
}

const defaultConfig = {
    config: {
        globals: {
            DEV: (typeof DEV !== "undefined") ? DEV : undefined,
            WAPP: (typeof WAPP !== "undefined") ? WAPP : undefined,
            RUN: (typeof RUN !== "undefined") ? RUN : undefined,
            TYPE: (typeof TYPE !== "undefined") ? TYPE : undefined,
            ROOT: (typeof ROOT !== "undefined") ? ROOT : "/",
            NAME: (typeof NAME !== "undefined") ? NAME : undefined,
        }
    }
};

export function run(p = defaultConfig) {

    if (p?.config?.globals && !p.config.globals.RUN){
        p.config.globals.RUN = p.config?.globals.NAME || "wapplr-authentication"
    }

    const wapp = createClient(p).wapp;
    const globals = wapp.globals;
    const {DEV} = globals;

    const app = wapp.client.app;
    app.use(createMiddleware({wapp, ...p}));
    wapp.client.listen();

    if (typeof DEV !== "undefined" && DEV && module.hot){
        app.hot = module.hot;
        module.hot.accept();
    }

    return wapp;
}

if (typeof RUN !== "undefined" && RUN === "wapplr-authentication") {
    run();
}
