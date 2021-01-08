import defaultMessages from "./defaultMessages";
import getSession from "./getSession";
import getStatues from "./statuses";

export default function getApi(p = {}) {

    const {wapp = {}, Model} = p;
    const {server = {}} = wapp;
    const {app} = server;

    const globalConfig = (server.settings && server.settings.apiConfig) ? server.settings.apiConfig : {};
    const globalApiConfigForUser = globalConfig.user || {};
    const config = (p.config) ? {...globalApiConfigForUser, ...p.config} : {...globalApiConfigForUser};

    const defaultFieldsPrefix = Model.defaultFieldsPrefix || "";
    const modelName = Model.modelName || "User";

    const session = getSession(p);
    const {setRestoreItselfStatus} = getStatues(p);

    const {
        disableAddApiRoutes = false,
        apiRoute = "/api/" + modelName.toLowerCase()
    } = config;

    const login = function (req, res) {

        const local = config.currentLanguage;
        const languages = config.languages || {};
        const messages = languages[local] || defaultMessages;

        Model.findOne({[defaultFieldsPrefix+"email"]: req.body.email}).exec(function (err, user) {

            if (err || !user) {
                return res.json({
                    success: false,
                    message: messages.incorrectemail,
                    field: "email"
                });
            }

            user.comparePassword(req.body.password, function (err, isMatch) {
                if (isMatch) {
                    setRestoreItselfStatus({
                        doc:user,
                        disableChangeApprovedStatus: true,
                        callback: async function () {

                            await session.startAuthedSession(req, {userId: user.id, modelName: Model.modelName});

                            const data = {
                                success: true,
                                session: true,
                                date: new Date().getTime(),
                                userId: user.id
                            };

                            return res.json(data);
                        }
                    })
                } else if (err) {
                    return res.json({
                        success: false,
                        message: messages.signfail,
                        field: "email"
                    });
                } else {
                    return res.json({
                        success: false,
                        message: messages.incorrectpassword,
                        field: "password"
                    });
                }
            });

        });

    };

    const logout = async function (req, res) {
        const user = req.user;
        if (user){
            await session.endAuthedSession(req, res);
            return res.json({
                success: true,
                session: false,
                userId: user.id
            });
        } else {
            return res.json({
                success: false,
                message: "missing user",
            });
        }
    };

    if (!disableAddApiRoutes) {
        app.post(apiRoute+"/login", login);
        app.post(apiRoute+"/logout", logout);
    }

    return {login, logout}

}
