const { Sequelize } = require('sequelize')

const { config } = require('../config/config')
const setupModels = require('../db/models/index')

let URI = ''

if (config.dbType == 'postgres') {
    const USER = encodeURIComponent(config.dbPostgresUser)
    const PASSWORD = encodeURIComponent(config.dbPostgresPassword)
    URI = `postgres://${USER}:${PASSWORD}@${config.dbPostgresHost}:${config.dbPostgresPort}/${config.dbPostgresName}`
}

if (config.dbType == 'mysql') {
    const USER = encodeURIComponent(config.dbMysqlUser)
    const PASSWORD = encodeURIComponent(config.dbMysqlPassword)
    URI = `mysql://${USER}:${PASSWORD}@${config.dbMysqlHost}:${config.dbMysqlPort}/${config.dbMysqlName}`
}

const sequelize = new Sequelize(URI, {
    dialect: config.dbType,
    logging: true
})

setupModels(sequelize)

sequelize.sync()

module.exports = sequelize
