# Wapplr-react

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

const user = await wapp.server.authentications.getAuthentication({
    name: "author",
    addIfThereIsNot: true,
    config: {
        schemaFields: {
            firstName: {type: String},
            lastName: {type: String},
        },
        resolvers: function(p = {}) {
            const {modelName, Model} = p;
            const requestName = modelName.slice(0,1).toLowerCase() + modelName.slice(1);
            return {
                [requestName + "GetAll"]: {
                    type: "["+modelName+"]",
                    resolve: async function(p = {}) {
                        // eslint-disable-next-line no-unused-vars
                        const {args = {}} = p;
                        const users = await Model.find();
                        if (!users || (users && !users.length)){
                            return [];
                        }
                        return users;
                    }
                },
            }
        }
    }
})

wapp.server.listen();
```

```js
//client.js
/*...*/
const send = wapp.requests.send;
const response = await send({requestName:"userGetAll"});
const users = response.userGetAll;
```
## License

MIT

## License

MIT
