export default function addStatesHandle(p = {}) {

    const {wapp} = p;

    if (wapp.states) {
        wapp.states.addHandle({
            userToState: function userToState(req, res, next) {

                if (wapp.states.shouldInitializedStore) {
                    const appStateName = res.wappResponse.appStateName;
                    const initialState = window[appStateName];
                    if (initialState) {
                        req.wappRequest.user = initialState.req?.user || null;
                        req.user = req.wappRequest.user;
                    }
                }

                next();

            }
        })
    }

}
