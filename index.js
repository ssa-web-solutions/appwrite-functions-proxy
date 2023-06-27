const express = require('express')
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware')
require('dotenv').config()

const app = express()

const proxyOptions = {
    target: process.env.APPWRITE_URL,
    changeOrigin: true,
    pathRewrite(path) {
        const fnName = path.replace('/fn', '')
        return `/v1/functions/${fnName}/executions`
    },
    selfHandleResponse: true,
    onProxyReq(proxyReq) {
        proxyReq.setHeader('X-Appwrite-Key', process.env.APPWRITE_KEY)
        proxyReq.setHeader('X-Appwrite-Project', process.env.APPWRITE_PROJ)
        proxyReq.setHeader('Content-Type', 'application/json')
    },
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, _, res) => {
        const response = JSON.parse(responseBuffer.toString('utf8'))
        const output = {
            ...getFunctionResponseData(response)
        }
        if (response.statusCode) {
            res.statusCode = response.statusCode
            res.statusMessage = getStatusMessage(response.statusCode, proxyRes.statusMessage)
        }
        process.env.EXTRA_PROPS_IN_RESPONSE
            .split(',')
            .forEach(prop => {
                output[prop] = response[prop]
            })

        return JSON.stringify(output)
    }),
}

const filter = (_, req) => req.method == 'POST'
const proxy = createProxyMiddleware(filter, proxyOptions)

app.use('/fn/', proxy)

app.listen(process.env.PORT, process.env.HOST, () => {
    console.log(`Proxy Started`)
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