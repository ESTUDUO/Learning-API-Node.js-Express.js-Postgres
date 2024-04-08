require('dotenv').config()

const config = {
    env: process.env.NODE_ENV || 'dev',
    port: process.env.PORT || 3000,
    dbType: process.env.DB_TYPE,

    dbPostgresUser: process.env.POSTGRES_USER,
    dbPostgresPassword: process.env.POSTGRES_PASSWORD,
    dbPostgresHost: process.env.POSTGRES_HOST,
    dbPostgresName: process.env.POSTGRES_DB,
    dbPostgresPort: process.env.POSTGRES_PORT,

    dbMysqlUser: process.env.MYSQL_USER,
    dbMysqlPassword: process.env.MYSQL_ROOT_PASSWORD,
    dbMysqlHost: process.env.MYSQL_HOST,
    dbMysqlName: process.env.MYSQL_DATABASE,
    dbMysqlPort: process.env.MYSQL_PORT
}

module.exports = { config }
