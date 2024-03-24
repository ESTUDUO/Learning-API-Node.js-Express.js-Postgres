const express = require('express')
/* const cors = require('cors') */
const routerApi = require('./routes')

const { /* logErrors, */ errorHandler, boomErrorHandler } = require('./middlewares/error.handler')

const app = express()
const port = '3000'

app.use(express.json())

/* const whitelist = ['http://127.0.0.1:5500']
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
app.get('/', (req, res) => {
    res.send('Hola mi server en express')
})

// Endpoint simple en ruta de un nivel
app.get('/nueva-ruta', (req, res) => {
    res.send('Hola nueva ruta')
})

routerApi(app)

/* app.use(logErrors) */
app.use(boomErrorHandler)
app.use(errorHandler)

app.listen(port, () => {
    console.log('Mi port' + port)
})
