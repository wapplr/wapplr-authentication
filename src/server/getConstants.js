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
        passwordsNotEqual: "Passwords not equal",
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
        firstNamePlaceholder: "Enter your first name",
        lastName: "Last name",
        lastNamePlaceholder: "Enter your last name",
        email: "Email",
        emailPlaceholder: "Enter your email address",
        emailConfirmed: "Confirmed email",
        password: "Password",
        passwordPlaceholder: "Enter your password",
        passwordAgain: "Password again",
        passwordAgainPlaceholder: "Enter your password again",
        newPassword: "New password",
        newPasswordPlaceholder: "Enter a new password",
        emailConfirmationKey: "Email confirmation key",
        emailConfirmationKeyPlaceholder: "Enter your email confirmation key",
        passwordRecoveryKey: "Password recovery key",
        passwordRecoveryKeyPlaceholder: "Enter your password recovery key",
        acceptTerms: "Accept terms",
        acceptPrivacy: "Accept privacy",
    };

    return {messages, labels};

}
