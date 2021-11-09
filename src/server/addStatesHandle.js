import {getHelpersForResolvers} from "wapplr-posttypes/dist/server/getResolvers.js";

export default function addStatesHandle(p = {}) {

    const {wapp} = p;

    if (wapp.states) {
        wapp.states.addHandle({
            userToState: async function userToState(req, res, next) {

                const stateBeforeUserId = res.wappResponse.store.getState("req.user._id");
                const userId = req.wappRequest.user?._id;
                const changed = !((userId && stateBeforeUserId && stateBeforeUserId.toString() === userId.toString()) || (!userId && !stateBeforeUserId));

                if (changed) {

                    const modelName = req.session.modelName;
                    const postType = await wapp.server.postTypes.getPostType({name: modelName.toLowerCase()});
                    const {filterOutputRecord} = getHelpersForResolvers({wapp, ...postType});

                    const user = req.wappRequest.user;
                    const isAdmin = (user) ? user._status_isFeatured : false;
                    const isAuthor = true;
                    const isNotDeleted = (user) ? user._status_isNotDeleted : true;

                    res.wappResponse.store.dispatch(
                        wapp.states.runAction(
                            "req", {
                                name: "user",
                                value: (req.wappRequest.user) ? await filterOutputRecord(req.wappRequest.user, isAdmin, isAuthor, isNotDeleted) : null
                            }
                        )
                    );
                }

                next();

            }
        })
    }

}
