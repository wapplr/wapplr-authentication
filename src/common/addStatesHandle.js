export default function addStatesHandle(p = {}) {

    const {wapp} = p;

    if (wapp.states) {
        wapp.states.addHandle({
            userToState: function userToState(req, res, next) {

                if (wapp.target === "web" && wapp.states.shouldInitializedStore) {
                    const appStateName = res.wappResponse.appStateName;
                    const initialState = window[appStateName];
                    if (initialState) {
                        req.wappRequest.user = initialState.req?.user || null;
                        req.user = req.wappRequest.user;
                    }
                }

                const stateBefore = res.wappResponse.store.getState();
                const stateBeforeUserId = stateBefore.req.user?._id;
                const userId = req.wappRequest.user?._id;
                const changed = !((userId && stateBeforeUserId && stateBeforeUserId.toString() === userId.toString()) || (!userId && !stateBeforeUserId));

                if (changed) {
                    res.wappResponse.store.dispatch(wapp.states.runAction("req", {name: "user", value: (req.wappRequest.user) ? req.wappRequest.user : null}))
                    res.wappResponse.state = res.wappResponse.store.getState();
                }

                next();

            }
        })
    }

}
