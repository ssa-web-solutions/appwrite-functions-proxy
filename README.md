# appwrite-functions-proxy
A proxy that make it easier to consume appwrite functions

## Setup

Create your own .env file and set their values.

**EXTRA_PROPS_IN_RESPONSE**: is used to determine which properties from the default appwrite response you want to be in the proxy's response.

The others variables are self-explanatory =)

## Run

To run the server just run the command below in the terminal:

```sh
yarn start
```

then make a request as follows

```sh
curl --location 'http://localhost:3000/fn/{your_function_id}' \
--header 'Content-Type: application/json' \
--data '{ "test": "test" }'
```

That's all =D
