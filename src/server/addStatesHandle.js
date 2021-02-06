import {getHelpersForResolvers} from "wapplr-posttypes/dist/server/getResolvers.js";

export default function addStatesHandle(p = {}) {

    const {wapp} = p;

    if (wapp.states) {
        wapp.states.addHandle({
            userToState: async function userToState(req, res, next) {

                const stateBefore = res.wappResponse.store.getState();
                const stateBeforeUserId = stateBefore.req.user?._id;
                const userId = req.wappRequest.user?._id;
                const changed = !((userId && stateBeforeUserId && stateBeforeUserId.toString() === userId.toString()) || (!userId && !stateBeforeUserId));

                if (changed) {

                    const modelName = req.session.modelName;
                    const postType = await wapp.server.postTypes.getPostType({name: modelName.toLowerCase()});
                    const {filterOutputRecord} = getHelpersForResolvers({wapp, ...postType})

                    res.wappResponse.store.dispatch(
                        wapp.states.runAction(
                            "req", {
                                name: "user",
                                value: (req.wappRequest.user) ? filterOutputRecord(req.wappRequest.user, false, true) : null
                            }
                        )
                    )
                    res.wappResponse.state = res.wappResponse.store.getState();
                }

                next();

            }
        })
    }

}
