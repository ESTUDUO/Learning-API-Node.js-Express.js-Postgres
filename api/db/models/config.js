const { config } = require('../config/config')

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

module.exports = {
    development: {
        url: URI,
        dialect: 'postgres'
    },
    production: {
        url: URI,
        dialect: 'postgres'
    }
}
