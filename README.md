# Wapplr-authentication

This package is an authentication service for [Wapplr](https://github.com/wapplr/wapplr).

```js
//server.js
import wapplrAuthentication from "wapplr-authentication";
import wapplrServer from "wapplr";

const wapp = wapplrServer({config: {
        server: {
            database: {
                mongoConnectionString: "mongodb://localhost/wapplr",
            }
        },
        globals: {
            WAPP: "yourBuildHash",
            ROOT: __dirname
        }
    }
});

wapplrAuthentication({wapp});

const namePattern = /^.{1,30}$/;
const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const passwordPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,256}$/;

const user = await wapp.server.authentications.getAuthentication({
    name: "author",
    addIfThereIsNot: true,
    config: {
        cookieSecret: "yourHash",
        cookieOptions: {secure: "auto", signed: true, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000},
        cookieName: "wapplr.uid",
        
        mongoConnectionString: "mongodb://localhost/wapplr",

        modelName: "User",
        schemaFields: {
            name: {
                first: {
                    type: String,
                    wapplr: {
                        pattern: namePattern,
                        required: true
                    }
                },
                last: {
                    type: String,
                    wapplr: {
                        pattern: namePattern,
                        private: "author"
                    }
                }
            },
            email: {
                type: String,
                wapplr: {
                    pattern: emailPattern,
                    private: "author",
                    required: true
                }
            },
            emailConfirmed: {
                type: Boolean,
                default: false,
                wapplr: {
                    readOnly: true,
                    private: "author"
                }
            },
            password: {
                type: String,
                wapplr: {
                    pattern: passwordPattern,
                    disabled: true
                }
            },
            passwordRecoveryKey: {
                type: String,
                wapplr: { disabled: true }
            },
            emailConfirmationKey: {
                type: String,
                wapplr: { disabled: true }
            },
        },
        setSchemaMiddleware: function({schema}){},

        statuses: {
            featured: 120,
            approved: 100,
            requiredData: 50,
            created: 40,
            deleted: 30,
            banned: 20
        },
        statusField: "_status",
        requiredDataForStatus: {
            name: {
                first: { type: String }
            },
            email: { type: String },
            emailConfirmed: { type: Boolean, value: true },
        },

        admin: {
            email: "email@yourdomain.com", 
            password: Math.random().toString(36).slice(-8),
            name: {
                first: "Billy",
                last: "The Kid", 
            },
        },

        messages: {
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
            thereWasNoUser: "there was no user in the session",

            validationName: "Minimum 1 maximum 30 characters",
            validationEmail: "Invalid email format",
            validationPassword: "Min 8 characters both upper and lowercase",
        },
        
        labels: {
            firstName: "First name",
            lastName: "Last name",
            email: "Email",
            password: "Password",
            newPassword: "New password",
            emailConfirmationKey: "Email confirmation key"
        },

        resolvers: {
            getAll: function ({Model}) { 
                return {
                    extendResolver: "findMany",
                    args: null,
                    resolve: async function({input}) {
                        return await Model.find();
                    }
                }
            },
        }
    }
})

wapp.server.listen();
```

```js
//client.js
import wapplrClient from "wapplr";
import wapplrAuthentication from "wapplr-authentication";

const wapp = wapplrClient({config: {
        globals: {
            WAPP: "yourBuildHash"
        }
    }
});

wapp.client.authentications.getAuthentication({
    name: "user",
    addIfThereIsNot: true
});

wapp.client.listen();

/*...*/
const send = wapp.requests.send;
const response = await send({requestName:"userGetAll"});
const users = response.userGetAll;
```
## License

MIT

## License

MIT
