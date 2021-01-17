import wapplrServer from "wapplr";
import initAuthentication from "./initAuthentication";

export default function createServer(p = {}) {
    const wapp = p.wapp || wapplrServer({...p});
    return initAuthentication({wapp, ...p});
}

export function createMiddleware(p = {}) {
    return async function initAuthenticationMiddleware(req, res, next) {
        const wapp = req.wapp || p.wapp || createServer(p);
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
            ROOT: (typeof ROOT !== "undefined") ? ROOT : __dirname
        }
    }
}

export async function run(p = defaultConfig) {

    const wapp = await createServer(p);
    const globals = wapp.globals;
    const {DEV} = globals;

    const app = wapp.server.app;
    app.use(createMiddleware({wapp, ...p}));
    wapp.server.listen();

    if (typeof DEV !== "undefined" && DEV && module.hot){
        app.hot = module.hot;
        module.hot.accept("./index");
    }

    return wapp;
}

if (typeof RUN !== "undefined" && RUN === "wapplr-authentication") {
    run();
}
