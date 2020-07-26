const config = require('@femto-apps/config')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const RedisStore = require('connect-redis')(session)
const mongoose = require('mongoose')
const express = require('express')
const morgan = require('morgan')
const redis = require('redis')
const jetpack = require('fs-jetpack')
const authenticationConsumer = require('@femto-apps/authentication-consumer')

const Words = require('./modules/Words')

;(async () => {
    const app = express()
    const port = config.get('port')

    const words = new Words(jetpack.read('./data/cards.json', 'json'))

    mongoose.connect(config.get('mongo.uri') + config.get('mongo.db'), {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    mongoose.set('useCreateIndex', true)

    app.set('view engine', 'pug')

    app.use(express.static('public'))
    app.use(morgan('dev'))
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(bodyParser.json())
    app.use(cookieParser(config.get('cookie.secret')))
    app.use(session({
        store: new RedisStore({
            client: redis.createClient({
                host: config.get('redis.host'),
                port: config.get('redis.port')
            })
        }),
        secret: config.get('session.secret'),
        resave: false,
        saveUninitialized: false,
        name: config.get('cookie.name'),
        cookie: {
            maxAge: config.get('cookie.maxAge')
        }
    }))

    app.use(authenticationConsumer({
        tokenService: { endpoint: config.get('tokenService.endpoint') },
        authenticationProvider: { endpoint: config.get('authenticationProvider.endpoint'), consumerId: config.get('authenticationProvider.consumerId') },
        authenticationConsumer: { endpoint: config.get('authenticationConsumer.endpoint') },
        redirect: config.get('redirect')
    }))

    app.use(async (req, res, next) => {
        req.ip = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress

        next()
    })

    app.use((req, res, next) => {
        const links = []

        if (req.user) {
            links.push({ title: 'Logout', href: res.locals.auth.getLogout(`${config.get('authenticationConsumer.endpoint')}${req.originalUrl}`) })

            res.locals.user = req.user
        } else {
            links.push({ title: 'Login', href: res.locals.auth.getLogin(`${config.get('authenticationConsumer.endpoint')}${req.originalUrl}`) })
        }

        res.locals.nav = {
            title: config.get('title.suffix'),
            links
        }

        next()
    })

    app.get(['/', '/person', '/world', '/object', '/action', '/nature', '/random'], (req, res) => {
        let word = undefined
        let category = undefined

        if (req.originalUrl.includes('person')) {
            category = 'Person'
            word = words.generateWord(category.toLowerCase())
        } else if (req.originalUrl.includes('world')) {
            category = 'World'
            word = words.generateWord(category.toLowerCase())
        } else if (req.originalUrl.includes('object')) {
            category = 'Object'
            word = words.generateWord(category.toLowerCase())
        } else if (req.originalUrl.includes('action')) {
            category = 'Action'
            word = words.generateWord(category.toLowerCase())
        } else if (req.originalUrl.includes('nature')) {
            category = 'Nature'
            word = words.generateWord(category.toLowerCase())
        } else if (req.originalUrl.includes('random')) {
            category = 'Random'
            word = words.generateWord(category.toLowerCase())
        }

        console.log(category, word)

        res.render('index', {
            page: { title: `Word Description :: ${config.get('title.suffix')}` },
            word,
            category
        })
    })

    app.listen(port, () => console.log(`Board games app listening on port ${port}`))
})()