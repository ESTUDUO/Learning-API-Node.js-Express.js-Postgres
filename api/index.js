const express = require('express')
/* const cors = require('cors') */
const routerApi = require('./routes')

const {
    /* logErrors, */ errorHandler,
    boomErrorHandler,
    ormErrorHandler
} = require('./middlewares/error.handler')

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())

/* const whitelist = ['http://localhost:8080', 'http://localhost']
const options = {
    origin: (origin, callback) => {
        if (whitelist.includes(origin) || origin) {
            callback(null, true)
        } else {
            callback(new Error('No permitido'))
        }
    }
}
app.use(cors(options)) */

// Endpoint simple en la raiz
app.get('/api', (req, res) => {
    res.send('Hola mi server en express')
})

// Endpoint simple en ruta de un nivel
app.get('/api/nueva-ruta', (req, res) => {
    res.send('Hola nueva ruta')
})

routerApi(app)

/* app.use(logErrors) */
app.use(ormErrorHandler)
app.use(boomErrorHandler)
app.use(errorHandler)

app.listen(port, () => {
    console.log('Mi port' + port)
})
