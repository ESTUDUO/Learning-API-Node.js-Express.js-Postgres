const express = require('express')

const router = express.Router()

// Endpoint con varios query param

router.get('/', (req, res) => {
    const { limit, offset } = req.query
    if (limit && offset) {
        res.json({ limit, offset })
    } else {
        res.send('Falta algún parámetro')
    }
})

module.exports = router
