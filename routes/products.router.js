const express = require('express')
const ProductsService = require('./../services/products.services')
const router = express.Router()
const service = new ProductsService()
// Endpoint con datos random (con librería faker) y limite mediante query

router.get('/', async (req, res) => {
    const products = await service.find()

    res.json(products)
})

// Endpoint simple de un nivel. Este caso choca con el anterior ya que lo detecta como un id.
// Para solucionarlo se debe poner encima del anterior endpoint en el orden.

router.get('/filter', async (req, res) => {
    res.send('Yo soy un filtro')
})

// Endpoint con parámetro

router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params

        const product = await service.findOne(id)
        res.json(product)
    } catch (error) {
        next(error)
    }
})

router.post('/', async (req, res) => {
    const body = req.body
    const newProduct = await service.create(body)

    res.status(201).json(newProduct)
})

router.patch('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const body = req.body
        const product = await service.update(id, body)
        res.json(product)
    } catch (error) {
        next(error)
    }
})

router.delete('/:id', async (req, res) => {
    const { id } = req.params
    const rta = await service.delete(id)
    res.json(rta)
})

module.exports = router
