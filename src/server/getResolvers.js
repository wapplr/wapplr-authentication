import bcrypt from "bcrypt";
import mongoose from "mongoose";
import {getHelpersForResolvers} from "wapplr-posttypes/dist/server/getResolvers.js";

import defaultMessages from "./defaultMessages";
import getSession from "./getSession";

export default function getResolvers(p = {}) {

    const {wapp, Model, statusManager} = p;

    const config = (p.config) ? {...p.config} : {};

    const {
        messages = defaultMessages,
    } = config;

    const session = getSession(p);

    const {setRestoreStatusByAuthor, isDeleted} = statusManager;

    const resolvers = {
        signup: {
            extendResolver: "createOne",
            args: function (TC, schemaComposer) {

                const defaultResolver = TC.getResolver("createOne");
                const defaultRecord = defaultResolver.args.record;

                return {
                    password: "String!",
                    record: defaultRecord
                }
            },
            resolve: async function ({input}){

                const {args, editor, req, res, allRequiredFieldsAreProvided, missingFields, allFieldsAreValid, invalidFields} = input;
                const {password, record} = args;

                if (editor){
                    return {
                        error: {message: messages.alreadyLoggedIn},
                    }
                }

                if (!record.email){
                    return {
                        error: {message: messages.missingEmail},
                    }
                }

                if (!password || typeof password !== "string"){
                    return {
                        error: {message: messages.missingPassword},
                    }
                } else {
                    let invalidPassword = false;

                    try {
                        const jsonSchema = Model.getJsonSchema({doNotDeleteDisabledFields: true});
                        const pattern = jsonSchema.properties.password.wapplr.pattern;
                        if (pattern && !password.match(pattern)){
                            invalidPassword = true;
                        }
                    } catch (e) {}

                    if (invalidPassword){
                        return {
                            error: {message: messages.invalidPassword},
                        }
                    }

                }

                if (!allFieldsAreValid){
                    return {
                        error: {message: messages.invalidData + " [" +invalidFields.join(", ") +"]"},
                    }
                }

                if (!allRequiredFieldsAreProvided){
                    return {
                        error: {message: messages.missingData + " [" +missingFields.join(", ") +"]"},
                    }
                }

                try {

                    const existsUser = await Model.findOne({email: record.email});

                    if (existsUser){
                        return {
                            error: {message: messages.usedEmail},
                        }
                    }

                    const newId = mongoose.Types.ObjectId();
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(password, salt);

                    const user = new Model({
                        ...record,
                        _id: newId,
                        _author: newId,
                        _createdDate: new Date(),
                        password: hashedPassword,
                    });

                    statusManager.setNewStatus(user);
                    const savedUser = await user.save();

                    await session.startAuthedSession(req, {userId: savedUser._id, modelName: Model.modelName});
                    const populatedUser = await session.populateItemMiddleware(req, res);

                    return {
                        record: populatedUser,
                    }

                } catch (e){
                    return {
                        error: {message: e.message || messages.savePostDefaultFail},
                    }
                }

            },
        },
        login: {
            extendResolver: "updateById",
            args: {
                email: "String!",
                password: "String!",
            },
            resolve: async function ({input}) {
                try {
                    const {post, args, req, res, editorIsAuthor} = input;
                    const user = post;

                    if (user) {
                        const isMatch = await bcrypt.compare(args.password, user.password);
                        if (isMatch) {

                            if (editorIsAuthor) {
                                return {
                                    record: user,
                                }
                            }

                            if (isDeleted(user)) {
                                setRestoreStatusByAuthor(user);
                            }

                            const savedUser = await user.save();
                            await session.startAuthedSession(req, {userId: savedUser._id, modelName: Model.modelName});
                            const populatedUser = await session.populateItemMiddleware(req, res);

                            return {
                                record: populatedUser,
                            }

                        } else {
                            return {
                                error: {message: messages.incorrectPassword},
                            }
                        }
                    } else {
                        return {
                            error: {message: messages.incorrectEmail},
                        }
                    }
                } catch (e) {
                    return {
                        error: {message: e.message || messages.signFail},
                    }
                }
            },
        },
        logout: {
            extendResolver: "updateById",
            args: null,
            resolve: async function ({input, context}) {
                const {editor, req, res} = input;
                let user;
                if (editor){
                    user = await Model.findById(editor)
                }
                if (user && user._id){
                    await session.endAuthedSession(req, res);
                    await session.populateItemMiddleware(req, res)
                    return {
                        record: user,
                    };
                } else {
                    return {
                        error: {message: messages.thereWasNoUser},
                    }
                }
            },
        },
        me: {
            extendResolver: "findById",
            args: null,
            resolve: async function ({input}) {
                const {editor} = input;
                if (editor){
                    return await Model.findById(editor)
                }
                return null;
            }
        },
        ...(config.resolvers) ? config.resolvers : {}
    }

    const {createResolvers} = getHelpersForResolvers({wapp, Model, statusManager});

    return wapp.server.graphql.addResolversToTC({resolvers: createResolvers(resolvers), TCName: Model.modelName})
}
