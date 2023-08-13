const express = require('express')
const bodyParser = require('body-parser')
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware')
require('dotenv').config()

const app = express()

const proxyOptions = {
    target: process.env.APPWRITE_URL,
    changeOrigin: true,
    pathRewrite(path) {
        const fnName = path.replace('/fn/', '')
        return `/v1/functions/${fnName}/executions`
    },
    selfHandleResponse: true,
    async onProxyReq(proxyReq, request) {
        console.info('proxying request on endpoint', request.path)
        let body = { 
            data: JSON.stringify({ ...request.body, appwReqHeaders: request.headers })
        }
        if (request.headers.hasOwnProperty('x-async')) {
            body.async = true
        }
        body = JSON.stringify(body)
        proxyReq.setHeader('X-Appwrite-Key', process.env.APPWRITE_KEY)
        proxyReq.setHeader('X-Appwrite-Project', process.env.APPWRITE_PROJ)
        proxyReq.setHeader('Content-Type', 'application/json')
        proxyReq.setHeader('Content-Length', body.length)
        proxyReq.write(body)
    },
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, _, res) => {
        const response = JSON.parse(responseBuffer.toString('utf8'))
        const output = {
            ...getFunctionResponseData(response)
        }
        console.info('proxying response')
        console.info(output)
        if (response.statusCode) {
            res.statusCode = response.statusCode
            res.statusMessage = getStatusMessage(response.statusCode, proxyRes.statusMessage)
        }
        output['appw_$id'] = response.$id
        process.env.EXTRA_PROPS_IN_RESPONSE
            .split(',')
            .forEach(prop => {
                output['appw_'+ prop] = response[prop]
            })

        return JSON.stringify(output)
    }),
}

const filter = (_, req) => req.method == 'POST'
const proxy = createProxyMiddleware(filter, proxyOptions)

app.use(bodyParser.json())
app.use('/fn/', proxy)

app.get('/', (_, res) => res.json({message: 'The appwrite proxy has successfully been started =)'}))

app.listen(process.env.PORT, process.env.HOST, () => {
    console.info(`The appwrite proxy has successfully been started on: ${process.env.HOST}:${process.env.PORT}`)
})

function getStatusMessage(statusCode, defaultMessage) {
    if (statusCode >= 500) {
        return 'Server Error'
    } else if(statusCode >= 400) {
        return 'Bad Request'
    } else {
        return defaultMessage
    }
}

function getFunctionResponseData(response) {
    try {
        return JSON.parse(response.response)
    } catch (e) {
        return {data: response.response}
    }
}