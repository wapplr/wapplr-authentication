export default function addStatesHandle(p = {}) {

    const {wapp} = p;

    if (wapp.states) {
        wapp.states.addHandle({
            userToState: function userToState(req, res, next) {

                if (wapp.target === "web" && !wapp.states.initialized) {
                    const appStateName = wapp.response.appStateName;
                    const initialState = window[appStateName];
                    if (initialState) {
                        req.user = initialState.req?.user || null;
                        req.wapp.request.user = req.user;
                    }
                }

                const stateBefore = req.wapp.states.store.getState();
                const stateBeforeUserId = stateBefore.req.user?._id;
                const userId = req.wapp.request.user?._id;
                const changed = !((userId && stateBeforeUserId && stateBeforeUserId.toString() === userId.toString()) || (!userId && !stateBeforeUserId));

                if (changed) {
                    wapp.states.store.dispatch(wapp.states.runAction("req", {name: "user", value: (req.wapp.request.user) ? req.wapp.request.user : null}))
                    wapp.response.state = wapp.states.store.getState();
                }

                next();

            }
        })
    }

}
