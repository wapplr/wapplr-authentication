import bcrypt from "bcrypt";
import mongoose from "mongoose";
import {getHelpersForResolvers} from "wapplr-posttypes/dist/server/getResolvers.js";

import defaultMessages, {defaultLabels} from "./defaultMessages";
import getSession from "./getSession";
import getCrypto from "./crypto";

export default function getResolvers(p = {}) {

    const {wapp, Model, statusManager} = p;

    const config = (p.config) ? {...p.config} : {};

    const {
        messages = defaultMessages,
        labels = defaultLabels,
        mailer = {
            send: async function (type, data, input) {
                console.log("[WAPPLR-AUTHENTICATION] No email module installed", type);
                return new Promise(function (resolve) {return resolve();})
            }
        },
        beforeCreateResolvers,
        ...rest
    } = config;

    const {
        cookieSecret = "yourHash",
    } = config;

    const session = getSession(p);

    const {setRestoreStatusByAuthor, isDeleted, isFeatured, setNewStatus} = statusManager;
    const crypto = getCrypto({password: cookieSecret});

    const resolvers = {
        signup: {
            extendResolver: "createOne",
            args: function (TC, schemaComposer) {

                const defaultResolver = TC.getResolver("createOne");
                const defaultRecord = defaultResolver.args.record;

                return {
                    email: "String!",
                    password: "String!",
                    record: defaultRecord
                }
            },
            resolve: async function ({input}){

                const {args, editor, req, res, allRequiredFieldsAreProvided, allFieldsAreValid, mergedErrorFields} = input;
                const {password, email, record} = args;

                if (editor){
                    return {
                        error: {message: messages.alreadyLoggedIn},
                    }
                }

                let invalidPassword = false;
                let validationMessageForPassword = messages.invalidPassword;
                const missingPassword = (!password || typeof password !== "string");

                if (!missingPassword) {
                    try {
                        const jsonSchema = Model.getJsonSchema({doNotDeleteDisabledFields: true});
                        const pattern = jsonSchema.properties.password?.wapplr?.pattern;
                        if (pattern && !password.match(pattern)) {
                            validationMessageForPassword = jsonSchema.properties.password?.wapplr?.validationMessage;
                            invalidPassword = true;
                        }
                    } catch (e) {}
                }

                let invalidEmail = false;
                let validationMessageForEmail = messages.invalidEmail;
                const missingEmail = (!email || typeof email !== "string");

                if (!missingEmail) {
                    try {
                        const jsonSchema = Model.getJsonSchema({doNotDeleteDisabledFields: true});
                        const pattern = jsonSchema.properties.email?.wapplr?.pattern;
                        if (pattern && !email.match(pattern)) {
                            validationMessageForEmail = jsonSchema.properties.email?.wapplr?.validationMessage;
                            invalidEmail = true;
                        }
                    } catch (e) {}
                }

                if (!allFieldsAreValid || !allRequiredFieldsAreProvided || missingPassword || invalidPassword || missingEmail || invalidEmail){
                    return {
                        error: {
                            message: (!allRequiredFieldsAreProvided) ? messages.missingData : messages.invalidData,
                            errors: [
                                ...mergedErrorFields,

                                ...(missingPassword) ? [{path: "password", message: messages.missingPassword}] : [],
                                ...(!missingPassword && invalidPassword) ? [{path: "password", message: validationMessageForPassword}] : [],

                                ...(missingEmail) ? [{path: "email", message: messages.missingEmail}] : [],
                                ...(!missingEmail && invalidEmail) ? [{path: "email", message: validationMessageForEmail}] : []
                            ]
                        },
                    }
                }

                try {

                    const existsUser = await Model.findOne({email: email});

                    if (existsUser){
                        return {
                            error: {
                                message: messages.usedEmail,
                                errors: [{path:"email"}]
                            },
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
                        email: email,
                        password: hashedPassword,
                    });

                    user.emailConfirmed = false;
                    user.emailConfirmationKey = crypto.encrypt(JSON.stringify({time: Date.now(), _id: user._id}));

                    setNewStatus(user);
                    const savedUser = await user.save();

                    await mailer.send("signup", savedUser, input);

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
                                error: {
                                    message: messages.incorrectPassword,
                                    errors: [{path: "password"}]
                                },
                            }
                        }
                    } else {
                        return {
                            error: {
                                message: messages.incorrectEmail,
                                errors: [{path: "email"}]
                            },
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
                    user = editor;
                }
                if (user && user._id){
                    await session.endAuthedSession(req, res);
                    await session.populateItemMiddleware(req, res);
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
        forgotPassword: {
            extendResolver: "updateById",
            args: {
                email: "String!",
            },
            resolve: async function ({input}) {
                try {
                    const {post, editorIsAuthor, editor} = input;
                    const user = post;

                    if ((user && editorIsAuthor) || (user && !editor)) {

                        user.passwordRecoveryKey = crypto.encrypt(JSON.stringify({time: Date.now(), _id: user._id}));
                        const savedUser = await user.save();

                        await mailer.send("resetPassword", savedUser, input);

                        return {
                            record: {
                                _id: (user && editorIsAuthor) ? savedUser._id : savedUser.email,
                                email: savedUser.email
                            }
                        }

                    } else {
                        return {
                            error: {
                                message: messages.incorrectEmail,
                                errors: [{path: "email"}]
                            },
                        }
                    }
                } catch (e) {
                    return {
                        error: {message: e.message || messages.signFail},
                    }
                }
            },
        },
        changePassword: {
            extendResolver: "updateById",
            args: {
                _id: "MongoID!",
                password: "String!",
                newPassword: "String!",
            },
            wapplr: {
                newPassword: {
                    wapplr: {
                        pattern: Model.getJsonSchema({doNotDeleteDisabledFields: true}).properties.password?.wapplr?.pattern,
                        validationMessage: messages.validationPassword,
                        formData: {
                            label: labels.newPassword,
                            type: "password"
                        }
                    }
                },
            },
            resolve: async function ({input, resolverProperties}) {
                try {
                    const {post, args, editorIsAuthor} = input;

                    const {password, newPassword} = args;

                    if (!post){
                        return {
                            error: {message: messages.postNotFound},
                        }
                    }

                    if (!editorIsAuthor){
                        return {
                            error: {message: messages.accessDenied},
                        }
                    }

                    const missingPassword = (!password || typeof password !== "string");

                    let invalidNewPassword = false;
                    let validationMessageForNewPassword = messages.invalidNewPassword;
                    const missingNewPassword = (!newPassword || typeof newPassword !== "string");

                    if (!missingNewPassword) {
                        try {
                            const pattern = resolverProperties?.wapplr?.newPassword?.wapplr?.pattern;
                            if (pattern && !newPassword.match(pattern)) {
                                validationMessageForNewPassword = resolverProperties?.wapplr?.newPassword?.wapplr?.validationMessage;
                                invalidNewPassword = true;
                            }
                        } catch (e) {}
                    }

                    if (missingPassword || missingNewPassword || invalidNewPassword){
                        return {
                            error: {
                                message: (missingPassword || missingNewPassword) ? messages.missingData : messages.invalidData,
                                errors: [
                                    ...(missingPassword) ? [{path: "password", message: messages.missingPassword}] : [],
                                    ...(missingNewPassword) ? [{path: "newPassword", message: messages.missingData}] : [],
                                    ...(!missingNewPassword && invalidNewPassword) ? [{path: "newPassword", message: validationMessageForNewPassword}] : []
                                ]
                            },
                        }
                    }

                    try {

                        const user = post;

                        const isMatch = await bcrypt.compare(args.password, user.password);
                        if (isMatch) {

                            const salt = await bcrypt.genSalt(10);
                            user.password = await bcrypt.hash(newPassword, salt);

                            if (isDeleted(user)) {
                                setRestoreStatusByAuthor(user);
                            }

                            const savedUser = await user.save();

                            return {
                                record: savedUser,
                            }

                        } else {
                            return {
                                error: {
                                    message: messages.incorrectPassword,
                                    errors: [{path: "password"}]
                                },
                            }
                        }

                    } catch (e){
                        return {
                            error: {message: e.message || messages.savePostDefaultFail},
                        }
                    }


                } catch (e) {
                    return {
                        error: {message: e.message || messages.signFail},
                    }
                }
            },
        },
        resetPassword: {
            extendResolver: "updateById",
            args: {
                email: "String!",
                passwordRecoveryKey: "String!",
                password: "String!",
            },
            resolve: async function ({input}) {
                try {
                    const {post, args, req, res, editorIsAuthor, editor} = input;
                    const {password, passwordRecoveryKey} = args;

                    const user = post;

                    if (!user){
                        return {
                            error: {
                                message: messages.incorrectEmail,
                                errors: [{path: "email"}]
                            },
                        }
                    }

                    if (!(editorIsAuthor || !editor)){
                        return {
                            error: {
                                message: messages.accessDenied
                            },
                        }
                    }


                    let invalidPassword = false;
                    let validationMessageForPassword = messages.invalidPassword;
                    const missingPassword = (!password || typeof password !== "string");

                    if (!missingPassword) {
                        try {
                            const jsonSchema = Model.getJsonSchema({doNotDeleteDisabledFields: true});
                            const pattern = jsonSchema.properties.password?.wapplr?.pattern;
                            if (pattern && !password.match(pattern)) {
                                validationMessageForPassword = jsonSchema.properties.password?.wapplr?.validationMessage;
                                invalidPassword = true;
                            }
                        } catch (e) {}
                    }

                    const missingPasswordRecoveryKey = (!passwordRecoveryKey || typeof passwordRecoveryKey !== "string");

                    if (missingPassword || invalidPassword || missingPasswordRecoveryKey){
                        return {
                            error: {
                                message: (!missingPassword && invalidPassword) ? validationMessageForPassword : (missingPassword) ? messages.missingPassword : messages.invalidPassword,
                                errors: [
                                    ...(missingPassword) ? [{path: "password", message: messages.missingPassword}] : [],
                                    ...(!missingPassword && invalidPassword) ? [{path: "password", message: validationMessageForPassword}] : [],
                                    ...(missingPasswordRecoveryKey) ? [{path: "passwordRecoveryKey", message: messages.missingPasswordRecoveryKey}] : []
                                ]
                            },
                        }
                    }

                    const isMatch = (user.passwordRecoveryKey === passwordRecoveryKey);

                    if (isMatch) {

                        const salt = await bcrypt.genSalt(10);
                        user.password = await bcrypt.hash(password, salt);
                        user.passwordRecoveryKey = null;

                        if (isDeleted(user)) {
                            setRestoreStatusByAuthor(user);
                        }

                        const savedUser = await user.save();

                        if (editorIsAuthor) {
                            return {
                                record: savedUser,
                            }
                        } else {

                            await session.startAuthedSession(req, {userId: savedUser._id, modelName: Model.modelName});
                            const populatedUser = await session.populateItemMiddleware(req, res);

                            return {
                                record: populatedUser,
                            }

                        }

                    } else {
                        return {
                            error: {
                                message: messages.incorrectPasswordRecoveryKey,
                                errors: [{path: "passwordRecoveryKey"}]
                            },
                        }
                    }

                } catch (e) {
                    return {
                        error: {message: e.message || messages.signFail},
                    }
                }
            },
        },
        changeEmail: {
            extendResolver: "updateById",
            args: {
                _id: "MongoID!",
                email: "String!",
                password: "String!",
            },
            resolve: async function ({input}) {
                try {
                    const {post, args, editorIsAuthor} = input;

                    const {email, password} = args;

                    if (!post){
                        return {
                            error: {message: messages.postNotFound},
                        }
                    }

                    if (!editorIsAuthor){
                        return {
                            error: {message: messages.accessDenied},
                        }
                    }

                    let invalidPassword = false;
                    let validationMessageForPassword = messages.invalidPassword;
                    const missingPassword = (!password || typeof password !== "string");

                    if (!missingPassword) {
                        try {
                            const jsonSchema = Model.getJsonSchema({doNotDeleteDisabledFields: true});
                            const pattern = jsonSchema.properties.password?.wapplr?.pattern;
                            if (pattern && !password.match(pattern)) {
                                validationMessageForPassword = jsonSchema.properties.password?.wapplr?.validationMessage;
                                invalidPassword = true;
                            }
                        } catch (e) {}
                    }

                    let invalidEmail = false;
                    let validationMessageForEmail = messages.invalidEmail;
                    const missingEmail = (!email || typeof email !== "string");

                    if (!missingEmail) {
                        try {
                            const jsonSchema = Model.getJsonSchema({doNotDeleteDisabledFields: true});
                            const pattern = jsonSchema.properties.email?.wapplr?.pattern;
                            if (pattern && !email.match(pattern)) {
                                validationMessageForEmail = jsonSchema.properties.email?.wapplr?.validationMessage;
                                invalidEmail = true;
                            }
                        } catch (e) {}
                    }

                    if (missingPassword || invalidPassword || missingEmail || invalidEmail){
                        return {
                            error: {
                                message: (missingPassword || missingEmail) ? messages.missingData : messages.invalidData,
                                errors: [

                                    ...(missingPassword) ? [{path: "password", message: messages.missingPassword}] : [],
                                    ...(!missingPassword && invalidPassword) ? [{path: "password", message: validationMessageForPassword}] : [],

                                    ...(missingEmail) ? [{path: "email", message: messages.missingEmail}] : [],
                                    ...(!missingEmail && invalidEmail) ? [{path: "email", message: validationMessageForEmail}] : []
                                ]
                            },
                        }
                    }

                    try {

                        const user = post;

                        const noChanges = (user.email === email);

                        if (noChanges){
                            return {
                                error: {
                                    message: messages.noChanges,
                                    errors: [{path: "email"}]
                                },
                            }
                        }

                        const isMatch = await bcrypt.compare(args.password, user.password);
                        if (isMatch) {

                            const existsUser = await Model.findOne({email: email});

                            if (existsUser){
                                return {
                                    error: {
                                        message: messages.usedEmail,
                                        errors: [{path:"email"}]
                                    },
                                }
                            }

                            user.email = email;
                            user.emailConfirmed = false;
                            user.emailConfirmationKey = crypto.encrypt(JSON.stringify({time: Date.now(), _id: user._id}));

                            if (isDeleted(user)) {
                                setRestoreStatusByAuthor(user);
                            } else if (!isFeatured(user)){
                                setNewStatus(user);
                            }

                            const savedUser = await user.save();

                            await mailer.send("emailConfirmation", savedUser, input);

                            return {
                                record: savedUser,
                            }

                        } else {
                            return {
                                error: {
                                    message: messages.incorrectPassword,
                                    errors: [{path: "password"}]
                                },
                            }
                        }

                    } catch (e){
                        return {
                            error: {message: e.message || messages.savePostDefaultFail},
                        }
                    }


                } catch (e) {
                    return {
                        error: {message: e.message || messages.signFail},
                    }
                }
            },
        },
        emailConfirmation: {
            extendResolver: "updateById",
            args: {
                email: "String!",
                emailConfirmationKey: "String!"
            },
            wapplr: {
                emailConfirmationKey: {
                    wapplr: {
                        formData: {
                            label: labels.emailConfirmationKey,
                        }
                    }
                },
            },
            resolve: async function ({input}) {
                try {
                    const {post, args, editorIsAuthor, editor} = input;
                    const {emailConfirmationKey} = args;

                    const user = post;

                    if (!user){
                        return {
                            error: {
                                message: messages.incorrectEmail,
                                errors: [{path: "email"}]
                            },
                        }
                    }

                    if (!(editorIsAuthor || !editor)){
                        return {
                            error: {
                                message: messages.accessDenied
                            },
                        }
                    }

                    const missingEmailConfirmationKey = (!emailConfirmationKey || typeof emailConfirmationKey !== "string");

                    if (missingEmailConfirmationKey){
                        return {
                            error: {
                                message: messages.missingEmailConfirmationKey,
                                errors: [
                                    {path: "emailConfirmationKey", message: messages.missingEmailConfirmationKey}
                                ]
                            },
                        }
                    }

                    if (user.emailConfirmed){
                        return {
                            error: {message: messages.alreadyConfirmedEmail},
                        }
                    }

                    const isMatch = (user.emailConfirmationKey === emailConfirmationKey);

                    if (isMatch) {

                        user.emailConfirmed = true;
                        user.emailConfirmationKey = null;

                        if (isDeleted(user)) {
                            setRestoreStatusByAuthor(user);
                        } else if (!isFeatured(user)){
                            setNewStatus(user);
                        }

                        const savedUser = await user.save();

                        if (editorIsAuthor){
                            return {
                                record: savedUser,
                            }
                        } else {
                            return {
                                record: null
                            }
                        }

                    } else {
                        return {
                            error: {
                                message: messages.incorrectEmailConfirmationKey,
                                errors: [{path: "emailConfirmationKey"}]
                            },
                        }
                    }

                } catch (e) {
                    return {
                        error: {message: e.message || messages.signFail},
                    }
                }
            },
        },
        emailConfirmationSendAgain: {
            extendResolver: "updateById",
            args: {
                _id: "MongoID!",
            },
            resolve: async function ({input}) {
                try {
                    const {post, editorIsAuthor} = input;

                    if (!post){
                        return {
                            error: {message: messages.postNotFound},
                        }
                    }

                    if (!editorIsAuthor){
                        return {
                            error: {message: messages.accessDenied},
                        }
                    }

                    const user = post;

                    if (!user.emailConfirmed){

                        const needToSave = !(user.emailConfirmationKey);

                        if (needToSave) {
                            user.emailConfirmationKey = crypto.encrypt(JSON.stringify({time: Date.now(), _id: user._id}));
                        }

                        const savedUser = (needToSave) ? await user.save() : user;

                        await mailer.send("emailConfirmation", savedUser, input);

                        return {
                            record: savedUser,
                        }

                    } else {
                        return {
                            error: {message: messages.alreadyConfirmedEmail},
                        }
                    }

                } catch (e) {
                    return {
                        error: {message: e.message || messages.signFail},
                    }
                }
            },
        },
        ...(config.resolvers) ? config.resolvers : {}
    };

    if (beforeCreateResolvers){
        beforeCreateResolvers(resolvers, {...p, config: {...rest, messages, labels, mailer}});
    }

    const {createResolvers} = getHelpersForResolvers({wapp, Model, statusManager, messages});

    return wapp.server.graphql.addResolversToTC({resolvers: createResolvers(resolvers), TCName: Model.modelName})
}
