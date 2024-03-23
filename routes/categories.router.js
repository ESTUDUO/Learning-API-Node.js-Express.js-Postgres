const express = require('express')

const router = express.Router()

// Endpoint con varios parametros en la url

router.get('/:categoryId/products/:productId', (req, res) => {
    const { categoryId, productId } = req.params
    res.json({
        categoryId,
        productId
    })
})

module.exports = router
