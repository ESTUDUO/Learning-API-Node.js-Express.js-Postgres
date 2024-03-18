const express = require('express')
const { faker } = require('@faker-js/faker') // Librería que genera datos random

const app = express()

const port = '3000'

// Endpoint simple en la raiz

app.get('/', (req, res) => {
    res.send('Hola mi server en express')
})

// Endpoint simple en ruta de un nivel

app.get('/nueva-ruta', (req, res) => {
    res.send('Hola nueva ruta')
})

// Endpoint con datos random y limite mediante query

app.get('/products', (req, res) => {
    const products = []
    const { size } = req.query
    const limit = size || 10

    for (let index = 0; index < limit; index++) {
        products.push({
            name: faker.commerce.productName(),
            price: parseInt(faker.commerce.price(), 10),
            image: faker.image.imageUrl()
        })
    }

    res.json(products)
})

// Endpoint con parámetro

app.get('/products/:id', (req, res) => {
    const { id } = req.params
    res.json([{ id, name: 'Producto 1', precio: 100 }])
})

// Endpoint simple de un nivel. Este caso choca con el anterior ya que lo detecta como un id.
// Para solucionarlo se debe poner encima del anterior endpoint en el orden.

app.get('/products/filter', (req, res) => {
    res.send('Yo soy un filtro')
})

// Endpoint con varios parametros en la url

app.get('/categories/:categoryId/products/:productId', (req, res) => {
    const { categoryId, productId } = req.params
    res.json({
        categoryId,
        productId
    })
})

// Endpoint con varios query param

app.get('/users', (req, res) => {
    const { limit, offset } = req.query
    if (limit && offset) {
        res.json({ limit, offset })
    } else {
        res.send('Falta algún parámetro')
    }
})

app.listen(port, () => {
    console.log('Mi port' + port)
})
