const defaultMessages = {

    signfail: "Sorry, there was an issue signing you in, please try again",
    emailfail: "Sorry, there was an issue sending email out, please try again",
    incorrectpassword: "Incorrect password",
    incorrectemail: "Incorrect email",
    incorrectusertype: "Incorrect registration type",
    incorrectemailfacebook: "If you use email of facebook service, please login with your facebook account",
    confirmationfail: "Sorry, there was an issue validating your email, please try again",
    confirmsendfail: "Sorry, there was an issue sending email to you, please try again",
    mincharerror: function(a){return "Minimum "+a+" character"},
    passwordequalerror: "Password does not match the confirm password",
    resetfail: "Sorry, there was an issue saving new password, please try again",
    nochange: "There was no change",
    saveemailfail: "Sorry, there was an issue saving your email, please try again",
    saveavatarfail: "Sorry, there was an issue saving your avatar, please try again",
    usedemail: "Email was already used",
    basicdatafail: "Sorry, there was an issue saving data, please try again",
    incorrectresetdata: "Your email or your reset key is incorrect",
    deleteaccountfail: "Sorry, there was an issue deleting your account, please try again",
    saveuserdefaultfail: "Sorry, there was an issue save user, please try again",
    deleteuserdefaultfail: "Sorry, there was an issue delete user, please try again",
    notificationsettingsfail: "Sorry, there was an issue save your notification settings, please try again",

    statusregistered: "registered",
    statusdeleteditself: "deleted",
    statusbanned: "user banned permanently",
    statusrequireddata1: "!required data & email validated",
    statusrequireddata2: "required data & !email validated",
    statusrequireddata3: "required data are available",
    statusapproved: "user approved",
};

export default defaultMessages;
