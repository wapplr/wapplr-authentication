import defaultMessages from "./defaultMessages";
import {defaultDescriptor} from "./utils";

const APPROVED = "approved"
const REQUIREDDATAANDEMAILVALIDATED = "required data & email validated"
const REQUIREDDATAANDNOTEMAILVALIDATED = "required data & !email validated"
const NOTREQUIREDDATAANDEMAILVALIDATED = "!required data & email validated"
const REGISTERED = "registered";
const DELETEDITSELF = "deleted itself"; 
const BANNED = "banned";

export const constants = {APPROVED, REQUIREDDATAANDEMAILVALIDATED, REQUIREDDATAANDNOTEMAILVALIDATED, NOTREQUIREDDATAANDEMAILVALIDATED, REGISTERED, DELETEDITSELF, BANNED}

export default function createStatusManager(p = {}) {

    const {wapp = {}} = p;
    const server = wapp;

    const globalConfig = (server.settings && server.settings.statusConfig) ? server.settings.statusConfig : {};
    const globalStatusConfigForUser = globalConfig.user || {};
    const config = (p.config) ? {...globalStatusConfigForUser, ...p.config} : {...globalStatusConfigForUser};

    const globalDatabaseConfig = (server.settings && server.settings.databaseConfig) ? server.settings.databaseConfig : {};
    const globalDatabaseConfigForUser = globalDatabaseConfig.user || {};
    const dbConfig = (p.config) ? {...globalDatabaseConfigForUser, ...p.config} : {...globalDatabaseConfigForUser};

    const defaultFieldsPrefix = (typeof dbConfig.defaultFieldsPrefix == "string") ? dbConfig.defaultFieldsPrefix : "";

    const {
        statuses = {
            [APPROVED]: 100,
            [REQUIREDDATAANDEMAILVALIDATED]: 70,
            [REQUIREDDATAANDNOTEMAILVALIDATED]: 60,
            [NOTREQUIREDDATAANDEMAILVALIDATED]: 50,
            [REGISTERED]: 40,
            [DELETEDITSELF]: 30,
            [BANNED]: 20
        },
        requiredData = {
            name: {
                first: 1,
                last: 1,
            }
        }
    } = config;

    function getDefaultStatus() {
        return statusManager.statuses[REGISTERED];
    }
    function getMinStatus() {
        return  statusManager.statuses[REQUIREDDATAANDEMAILVALIDATED];
    }
    function getOptions(){
        const options = [];
        Object.keys(statusManager.statuses).forEach(function(key){
            options.push({label:key, value:statusManager.statuses[key]})
        });
        return options;
    }
    function getStatusData(p = {}) {
        const {doc} = p;

        if (doc && doc.id){

            const local = config.currentLanguage;
            const languages = config.languages || {};
            const messages = languages[local] || defaultMessages;

            const {
                statusregistered = REGISTERED,
                statusdeleteditself = DELETEDITSELF,
                statusbanned = BANNED,
                statusrequireddata1 = NOTREQUIREDDATAANDEMAILVALIDATED,
                statusrequireddata2 = REQUIREDDATAANDNOTEMAILVALIDATED,
                statusrequireddata3 = REQUIREDDATAANDEMAILVALIDATED,
                statusapproved = APPROVED,
            } = messages;

            const deleteorrestorepoint = statusManager.statuses[REGISTERED];
            const currentStatus = doc[defaultFieldsPrefix + "status"] || deleteorrestorepoint;
            const deleteorrestore = (currentStatus < deleteorrestorepoint) ? "restore" : "delete";

            const approveenable = (currentStatus > statusManager.statuses[REQUIREDDATAANDNOTEMAILVALIDATED]-1 && currentStatus < statusManager.statuses[APPROVED]);
            const banenable = (currentStatus > statusManager.statuses[BANNED]);

            let statusname = statusregistered;

            Object.keys(statusManager.statuses).forEach(function(psk){
                if (statusManager.statuses[psk] === currentStatus) {
                    statusname = psk;
                }
            });

            if (statusname === DELETEDITSELF) {
                statusname = statusdeleteditself;
            }

            if (statusname === BANNED) {
                statusname = statusbanned;
            }

            if (statusname === NOTREQUIREDDATAANDEMAILVALIDATED) {
                statusname = statusrequireddata1;
            }

            if (statusname === REQUIREDDATAANDNOTEMAILVALIDATED) {
                statusname = statusrequireddata2;
            }

            if (statusname === REQUIREDDATAANDEMAILVALIDATED) {
                statusname = statusrequireddata3;
            }

            if (statusname === APPROVED) {
                statusname = statusapproved;
            }

            return {statusname, status:doc[defaultFieldsPrefix + "status"], deleteorrestore, approveenable, banenable}

        }
        return {statusname:"not found", status:statusManager.statuses[BANNED]-1};
    }

    function recursiveDataValidate({data, required}) {
        let valid = true;
        Object.keys(required).forEach(function(key) {
            if (required[key] && typeof required[key] === "object"){
                if (data[key] && typeof data[key] === "object") {
                    valid = recursiveDataValidate({data: data[key], required: required[key]})
                } else {
                    valid = false;
                }
            } else {
                if (required[key] && !data[key]) {
                    valid = false;
                }
            }
        });
        return valid;
    }

    function dinamicStatus({currentStatus, validRequiredData, emailisvalidated}) {
        let newStatus = currentStatus;
        if (validRequiredData && emailisvalidated) {
            newStatus = statusManager.statuses[REQUIREDDATAANDEMAILVALIDATED];
        }
        if (!emailisvalidated && validRequiredData) {
            newStatus = statusManager.statuses[REQUIREDDATAANDNOTEMAILVALIDATED];
        }
        if (emailisvalidated && !validRequiredData) {
            newStatus = statusManager.statuses[NOTREQUIREDDATAANDEMAILVALIDATED];
        }
        if (!emailisvalidated && !validRequiredData) {
            newStatus = statusManager.statuses[REGISTERED];
        }
        return newStatus;
    }

    function save({doc, newStatus, currentStatus, callback}) {
        if (newStatus && newStatus !== currentStatus){
            doc[defaultFieldsPrefix + "status"] = newStatus.toString();
            doc.save(function(err) {
                if (callback){
                    callback({err, status:newStatus, doc, event:"changed"})
                }
            })
        }else{
            callback({status:newStatus, doc, event:"nochanged"})
        }
    }

    function setStatus({doc, callback}) {

        if (doc && doc.id) {

            const currentStatus = (doc[defaultFieldsPrefix + "status"] && !isNaN(Number(doc[defaultFieldsPrefix + "status"])) ) ? Number(doc[defaultFieldsPrefix + "status"]) : 0;
            let newStatus = currentStatus || statusManager.statuses[REGISTERED];

            const emailisvalidated = doc.emailisvalidated || false;
            const validRequiredData = recursiveDataValidate({data:doc, required:statusManager.requiredData});

            if (currentStatus > (statusManager.statuses[REGISTERED]-1)) {
                newStatus = dinamicStatus({newStatus, validRequiredData, emailisvalidated});
            }

            save({doc, newStatus, currentStatus, callback})

        }else{
            callback({event:"missing document"})
        }

    }
    function setBanStatus({doc, callback}) {
        if (doc && doc.id) {
            const currentStatus = (doc[defaultFieldsPrefix + "status"] && !isNaN(Number(doc[defaultFieldsPrefix + "status"])) ) ? Number(doc[defaultFieldsPrefix + "status"]) : 0;
            let newStatus = currentStatus || statusManager.statuses[REGISTERED];
            if (currentStatus > statusManager.statuses[BANNED]) {
                newStatus = statusManager.statuses[BANNED];
            }
            save({doc, newStatus, currentStatus, callback})
        }else{
            callback({event:"missing document"})
        }
    }
    function setApproveStatus({doc, callback}) {
        if (doc && doc.id) {
            const currentStatus = (doc[defaultFieldsPrefix + "status"] && !isNaN(Number(doc[defaultFieldsPrefix + "status"])) ) ? Number(doc[defaultFieldsPrefix + "status"]) : 0;
            let newStatus = currentStatus || statusManager.statuses[REGISTERED];
            const minEnableApproveStatus = statusManager.getMinStatus();
            if (currentStatus > minEnableApproveStatus-1) {
                newStatus = statusManager.statuses[APPROVED];
            }
            save({doc, newStatus, currentStatus, callback})
        } else {
            callback({event:"missing document"})
        }
    }
    function setRestoreStatus({doc, callback}) {
        if (doc && doc.id) {
            const currentStatus = (doc[defaultFieldsPrefix + "status"] && !isNaN(Number(doc[defaultFieldsPrefix + "status"])) ) ? Number(doc[defaultFieldsPrefix + "status"]) : 0;
            let newStatus = currentStatus || statusManager.statuses[REGISTERED];

            const emailisvalidated = doc.emailisvalidated || false;
            const validRequiredData = recursiveDataValidate({data:doc, required:statusManager.requiredData});

            if (currentStatus < statusManager.statuses[DELETEDITSELF]+1 || currentStatus === statusManager.statuses[APPROVED]) {
                newStatus = dinamicStatus({newStatus, validRequiredData, emailisvalidated});
            }
            save({doc, newStatus, currentStatus, callback})
        }else{
            callback({event:"missing document"})
        }
    }
    function setDeleteItselfStatus({doc, callback}) {
        if (doc && doc.id) {

            const currentStatus = (doc[defaultFieldsPrefix + "status"] && !isNaN(Number(doc[defaultFieldsPrefix + "status"])) ) ? Number(doc[defaultFieldsPrefix + "status"]) : 0;
            let newStatus = currentStatus || statusManager.statuses[DELETEDITSELF];

            if (currentStatus > statusManager.statuses[DELETEDITSELF]) {
                newStatus = statusManager.statuses[DELETEDITSELF];
            }

            save({doc, newStatus, currentStatus, callback})

        }else{
            callback({event:"missing document"})
        }
    }
    function setRestoreItselfStatus({doc, disableChangeApprovedStatus, callback}) {
        if (doc && doc.id) {

            const currentStatus = (doc[defaultFieldsPrefix + "status"] && !isNaN(Number(doc[defaultFieldsPrefix + "status"])) ) ? Number(doc[defaultFieldsPrefix + "status"]) : 0;
            let newStatus = currentStatus || statusManager.statuses[DELETEDITSELF];

            const emailisvalidated = doc.emailisvalidated || false;
            const validRequiredData = recursiveDataValidate({data:doc, required:statusManager.requiredData});

            if (currentStatus === statusManager.statuses[DELETEDITSELF] || (currentStatus === statusManager.statuses[APPROVED] && !disableChangeApprovedStatus)) {
                newStatus = dinamicStatus({newStatus, validRequiredData, emailisvalidated});
            }
            save({doc, newStatus, currentStatus, callback})
        }else{
            callback({event:"missing document"})
        }
    }

    const statusManager = Object.create(Object.prototype, {
        constants: {
            ...defaultDescriptor,
            enumerable: false,
            value: constants
        },
        statuses: {
            ...defaultDescriptor,
            enumerable: false,
            value: statuses
        },
        requiredData: {
            ...defaultDescriptor,
            enumerable: false,
            value: requiredData
        },
        getDefaultStatus: {
            ...defaultDescriptor,
            value: getDefaultStatus
        },
        getMinStatus: {
            ...defaultDescriptor,
            value: getMinStatus
        },
        getOptions: {
            ...defaultDescriptor,
            value: getOptions
        },
        getStatusData: {
            ...defaultDescriptor,
            value: getStatusData
        },
        setStatus: {
            ...defaultDescriptor,
            value: setStatus
        },
        setBanStatus: {
            ...defaultDescriptor,
            value: setBanStatus
        },
        setApproveStatus: {
            ...defaultDescriptor,
            value: setApproveStatus
        },
        setRestoreStatus: {
            ...defaultDescriptor,
            value: setRestoreStatus
        },
        setDeleteItselfStatus: {
            ...defaultDescriptor,
            value: setDeleteItselfStatus
        },
        setRestoreItselfStatus: {
            ...defaultDescriptor,
            value: setRestoreItselfStatus
        }
    })

    return statusManager

}
