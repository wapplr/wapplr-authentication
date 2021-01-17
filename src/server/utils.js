import mongoose from "mongoose";
import bcrypt from "bcrypt";

export function mergeProperties(dest, src) {
    Object.getOwnPropertyNames(src).forEach(function forEachOwnPropertyName (name) {
        if (Object.hasOwnProperty.call(dest, name)) {
            return
        }
        const descriptor = Object.getOwnPropertyDescriptor(src, name);
        Object.defineProperty(dest, name, descriptor)
    });
    return dest
}

export const defaultDescriptor = {
    writable: true,
    enumerable: true,
    configurable: false,
}

export async function createAnAdmin({Model, statusManager, admin = {}}) {
    try {
        const adminExists = await Model.find({[statusManager.statusField]: {$gt: statusManager.getFeaturedStatus() - 1}})
        if (!adminExists || (adminExists && !adminExists.length)){
            const {
                email = "hello@wapplr.com",
                password = Math.random().toString(36).slice(-8),
                name = {
                    first: (admin.name && admin.name.first) ? admin.name.first : "Charlie",
                    last: (admin.name && admin.name.last) ? admin.name.last : "Wapplr",
                }
            } = admin;
            const userExists = await Model.findOne({email})
            if (userExists && userExists._id) {
                userExists[statusManager.statusField] = statusManager.getFeaturedStatus();
                const upgradedUser = await userExists.save()
                if (upgradedUser){
                    console.log("[wapplr-authentication]", "Your account with this email ["+email+"] was upgraded to admin")
                }
            } else {

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                const _id = new mongoose.Types.ObjectId();

                const newUserData = {
                    _id: _id,
                    _status: statusManager.getFeaturedStatus(),
                    _author: _id,
                    _createdDate: new Date(),
                    name,
                    email,
                    emailValidated: true,
                    password: hashedPassword,
                }

                const newUser = new Model(newUserData)
                const savedAdmin = await newUser.save();
                if (savedAdmin && savedAdmin._id) {
                    console.log("[WAPPLR-AUTHENTICATION]", "Your admin account created with this data:", {...newUserData, password}, "Password change required")
                }
            }
        }
    } catch (e){
        console.log(e)
    }
}
