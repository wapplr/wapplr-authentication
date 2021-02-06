const defaultMessages = {
    statusCreated: "registered",
    statusDeleted: "deleted",
    statusBanned: "banned",
    statusRequiredData: "required data is not provided",
    statusApproved: "approved",
    statusFeatured: "admin",

    savePostDefaultFail: "Sorry, there was an issue save the entry, please try again",
    invalidData: "Invalid data",
    missingData: "Missing data",
    lowStatusLevel: "Your status level is too low to perform the operation",
    postNotFound: "User not found",
    accessDenied: "You do not have permission to perform that operation",

    signFail: "Sorry, there was an issue signing you in, please try again",

    missingEmail: "Missing e-mail",
    invalidEmail: "Invalid e-mail",
    incorrectEmail: "Incorrect e-mail",
    usedEmail: "E-mail was already used",
    noChanges: "No changes",

    missingPassword: "Missing password",
    invalidPassword: "Invalid password",
    incorrectPassword: "Incorrect password",

    missingPasswordRecoveryKey: "Missing password recovery key",
    incorrectPasswordRecoveryKey: "Incorrect password recovery key",

    alreadyLoggedIn: "You are already logged in to this session",
    thereWasNoUser: "there was no user in the session",

    validationName: "Minimum 1 maximum 30 characters",
    validationEmail: "Invalid email format",
    validationPassword: "Min 8 characters both upper and lowercase",

};

export const defaultLabels = {
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    password: "Password"
}

export default defaultMessages;
