const express = require('express')
const routerApi = require('./routes')

const { /* logErrors, */ errorHandler, boomErrorHandler } = require('./middlewares/error.handler')

const app = express()
const port = '3000'

app.use(express.json())

routerApi(app)

// Endpoint simple en la raiz
app.get('/', (req, res) => {
    res.send('Hola mi server en express')
})

// Endpoint simple en ruta de un nivel
app.get('/nueva-ruta', (req, res) => {
    res.send('Hola nueva ruta')
})

/* app.use(logErrors) */
app.use(boomErrorHandler)
app.use(errorHandler)

app.listen(port, () => {
    console.log('Mi port' + port)
})
