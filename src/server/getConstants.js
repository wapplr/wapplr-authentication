import getDefaultConstants from "wapplr-posttypes/dist/server/getConstants";

export default function getConstants(p = {}) {

    const {name = "user"} = p;

    const defaultConstants = getDefaultConstants({name});

    const messages = {
        ...defaultConstants.messages,

        signFail: "Sorry, there was an issue signing you in, please try again",
        missingEmail: "Missing email",
        invalidEmail: "Invalid email",
        incorrectEmail: "Incorrect email",
        usedEmail: "Email was already used",
        noChanges: "No changes",
        missingPassword: "Missing password",
        invalidPassword: "Invalid password",
        incorrectPassword: "Incorrect password",
        missingPasswordRecoveryKey: "Missing password recovery key",
        incorrectPasswordRecoveryKey: "Incorrect password recovery key",
        missingEmailConfirmationKey: "Missing email confirmation key",
        incorrectEmailConfirmationKey: "Incorrect email confirmation key",
        alreadyConfirmedEmail: "Your email address has already been confirmed",
        alreadyLoggedIn: "You are already logged in to this session",
        thereWasNoUser: "There was no user in the session",

        validationName: "Minimum 1 maximum 30 characters",
        validationEmail: "Invalid email format",
        validationPassword: "Min 8 characters both upper and lowercase",
        validationTerms: "Acceptance of the terms is required",
        validationPrivacy: "Acceptance of the privacy is required",
    };

    const labels = {
        firstName: "First name",
        lastName: "Last name",
        email: "Email",
        emailConfirmed: "Confirmed email",
        password: "Password",
        newPassword: "New password",
        emailConfirmationKey: "Email confirmation key",
        acceptTerms: "Accept terms",
        acceptPrivacy: "Accept privacy",
    };

    return {messages, labels};

}
