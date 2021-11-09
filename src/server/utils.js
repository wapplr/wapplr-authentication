import mongoose from "mongoose";
import bcrypt from "bcrypt";
import {defaultDescriptor as commonDefaultDescriptor, mergeProperties as commonMergeProperties} from "../common/utils";

export const defaultDescriptor = commonDefaultDescriptor;
export const mergeProperties = commonMergeProperties;

export async function createAnAdmin({Model, statusManager, admin = {}}) {
    try {

        const {
            email,
            password,
            name = {
                first: (admin.name && admin.name.first) ? admin.name.first : "Admin",
            }
        } = admin;

        const userExists = (email) ? await Model.findOne({email}) : null;

        if ((email && password) || (userExists && userExists._id)){

            if (userExists && userExists._id) {

                if (!userExists._status_isFeatured) {

                    userExists._status = statusManager.getFeaturedStatus();
                    const upgradedUser = await userExists.save();
                    if (upgradedUser) {
                        console.log("[WAPPLR-AUTHENTICATION]", "Your account with this email [" + email + "] was upgraded to admin")
                    }

                }

            } else {

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                const _id = new mongoose.Types.ObjectId();

                const newUserData = {
                    _id: _id,
                    _status: statusManager.getFeaturedStatus(),
                    _author_status: statusManager.getFeaturedStatus(),
                    _author: _id,
                    _createdDate: new Date(),
                    name,
                    email,
                    emailConfirmed: true,
                    password: hashedPassword,
                };

                const newUser = new Model(newUserData);
                const savedAdmin = await newUser.save();
                if (savedAdmin && savedAdmin._id) {
                    console.log("[WAPPLR-AUTHENTICATION]", "Your admin account created with this data:", {...newUserData, password})
                }
            }

        }

    } catch (e){
        console.log(e)
    }
}
