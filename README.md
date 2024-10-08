# Curso Curso de Backend con Node.js: Base de Datos con PostgreSQL

## Clase 4 Configuración de Postgres en Docker

Se crea docker-compose-yml usado para crear el contenedor de postgres

```yml
services:
  postgres:
    image: postgres:latest //Aquí podemos dejar una versión concreta o la última
    environment:
      POSTGRES_DB: my_store // Esto más adelante irá en variables de ambiente separadas
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
    ports:
      - "5432:5432"
    volumes:
      - ./postgres_data:/var/lib/postgresql/data // Volumen donde se persisten los datos de la BBDD, esta dirección se puede ver en la configuración del docker
```

Para levantar el servicio concreto de postgres (nombre que le hemos dado al servicio) se usa el comando "docker-compose up -d postgress"

Otros comandos útiles de docker:

- docker-compose ps --> Nos muestra los servicios actualmente levantados
- docker-compose down --> Para los servicios actualmente levantados. Se puede añadir nombre del servicio si queremos solo parar uno en concreto

## Clase 5 Explorando Postgres: interfaces gráficas vs. terminal

docker-compose exec postgres bash

> De esta manera nos conectamos a la terminal del servicio llamado postgres. Desde aquí se puede configurar la bbdd. Pero se va a hacer desde interfaz gráfica

Añadimos un servicio de pgadmin (interfaz gráfica para postgres) al docker-compose

```yml
version: "3.3"

services:
  postgres:
    image: postgres:latest
    environment:
      POSTGRES_DB: my_store
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
    ports:
      - "5432:5432"
    volumes:
      - ./postgres_data:/var/lib/postgresql/data
  pgadmin:
    image: dpage/pgadmin4
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@mail.com
      - PGADMIN_DEFAULT_PASSWORD=root
    ports:
      - 5050:80 // No he averiguado el porqué de esta asignaciónd de puertos. En la documentación se habla de un proxy inverso. https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html#reverse-proxying
```

Levantamos el servicio de pgadmin con: docker-compose up -d pgadmin

Por último queda conectar pgadmin al servidor de postgres. Para ello hacemos lo siguiente:

1. Entramos en el navegador en localhost:5050 y nos logeamos con el usuario y contraseña definido en el docker-compose

2. En la opción de objeto > register > servidor accedemos a la configuración del servidor. Metemos nombre y en la pestaña conexión metemos los datos. Para el nombre/dirección de servidor, no vamos a meter la ip, ya que al tirar y levantar el docker cambiaría la ip y se perdería la conexión. En su lugar metermos el nombre del servidor que es el nombre dado en al servicio en el docker compose, en este caso postgres

Con esto queda configurado pgadmin

## Clase 6 Integración de node-postgres

Vamos a usar una librería para la integración entre node y postgres. Para ello instalamos pg con: npm i pg

Una vez hecho, agregamos una carpeta lib al proyecto done metemos un archivo postgres.js donde manejamos la conexión a la base de datos

```javascript
const { Client } = require('pg')

async function getConnection() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'admin',
        password: 'admin123',
        database: 'my_store'
    })
    await client.connect()

    return client
}

module.exports = getConnection
```

Ahora para poder hacer una conexión a BBDD vamos a usar un objeto cliente que es traido de la función getConnection que acabamos de crear:

```javascript
const getConnection = require('../libs/postgres')
```

Desde este momento podemos hacer conexiones usando este objeto. Por ejemplo lo usamos en el servicio de usuarios, en el método find:

```javascript
async find() {
    const client = await getConnection()
    const rta = await client.query('SELECT * FROM tasks')
    return rta.rows
}
```

El objeto client devuelto por getConnection tiene un método 'query' al que le pasamos las querys de consulta a base de datos.

## Clase 7 Manejando un Pool de conexiones

La forma de conexión a la base de datos usada anteriormente no es la más correcta. Es mejor usar un pool de conexiones. De esta manera la primera llamada a la base de datos creará una conexión mediante un pool y no abrirá una conexión por cada cliente como hacía el método de la clase anterior.

Para acceder mediante este método simplemente hacemos lo siguiente:

### 1. Creamos un nuevo archivo en libs con la conexión mediante pool

```javascript
const { Pool } = require('pg')

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'admin',
    password: 'admin123',
    database: 'my_store'
})

module.exports = pool

```

Esta vez no hace falta que vaya dentro de una función asíncrona ya que es algo que pool ya gestiona internamente.

### 2. Una vez tenemos la conexión la llamamos de la siguiente forma

Primeo importamos el objeto pool

```javascript
const pool = require('../libs/postgres.pool')
```

Y después lo añadimos al constructor de la clase, en este caso la clase productos.

```javascript
constructor() {
    this.products = []
    this.generate()
    this.pool = pool
    this.pool.on('error', (err) => console.error(err)) // Aquí capturamos los errores para mostrarlos por consola, no es obligatorio
}
```

Y por último, usamos el objeto para hacer la llamada mediante una query.

```javascript
async find() {
    const query = 'SELECT * FROM tasks'
    const rta = await this.pool.query(query)
    return rta.rows
}
```

## Clase 8 Variables de ambiente en Node.js

Hasta ahora se trataban los datos de conexión a base de datos dentro del código. Esto es una mala práctica. Se debe tratar en un archivo separado .env que no se suba a repositorios. Para ello vamos a hacer lo siguiente:

Primero se crea un archivo de conexión componiendo la siguiente URI:

  ```javascript
  postgres://<user>:<password>@<host>:<port>/<database>?<query>
  ```

  Se compone en los archivos de libs, tanto client como pool:

  ***postgres.pool.js***

  ```javascript
  const { Pool } = require('pg') // Se importa Pool de la librería
  const { config } = require('../config/config') // El archivo config manejará el acceso a los datos de conexión

  const USER = encodeURIComponent(config.dbUser) // Se usa encodeURIComponent para codificar caracteres especiales que puedan dar problemas en el URI (como por ejemplo: @ o $)
  const PASSWORD = encodeURIComponent(config.dbPassword) // Se usa encodeURIComponent para codificar caracteres especiales que puedan dar problemas en el URI (como por ejemplo: @ o $)
  const URI = `postgres://${USER}:${PASSWORD}@${config.dbHost}:${config.dbPort}/${config.dbName}` // Se compone la URI

  const pool = new Pool({ connectionString: URI }) // Se crea la conexión mediante pool

  module.exports = pool // Se exporta para tener acceso a la conexión establecida
  ```

***postgres.js***

  ```javascript
  const { Client } = require('pg')
  const { config } = require('../config/config')

  const USER = encodeURIComponent(config.dbUser)
  const PASSWORD = encodeURIComponent(config.dbPassword)
  const URI = `postgres://${USER}:${PASSWORD}@${config.dbHost}:${config.dbPort}/${config.dbName}`

  async function getConnection() {
      const client = new Client({ connectionString: URI })
      await client.connect()

      return client
  }

  module.exports = getConnection
  ```

Se separa la configuración de las variables usadas para configurar la base de datos, para proporcionar escalabilidad en caso de cambios a futuro no afectar al código.

Primero se debe instalar la dependencia de la librería encargada de leer de un archivo .env y trasladarlo a variables de entorno:

```jsx
npm install dotenv
```

Se separa en un archivo .env los datos delicados que solo queremos que esté en local y no se suba a repositorios.

***.env***

```jsx
PORT = 3000

POSTGRES_USER='admin'
POSTGRES_PASSWORD='admin123'
POSTGRES_HOST='localhost'
POSTGRES_DB='my_store'
POSTGRES_PORT='5432'

PGADMIN_DEFAULT_EMAIL='admin@mail.com'
PGADMIN_DEFAULT_PASSWORD='root'
PGADMIN_DEFAULT_PORT='5050'
```

> Importante: deberíamos dejar dentro del repositorio un archivo .env.example con los datos que necesitamos sin rellenar para que quien se descargue el proyecto sepa que datos tiene que rellenar

***.env.example***

```jsx
PORT = 

POSTGRES_USER=''
POSTGRES_PASSWORD=''
POSTGRES_HOST=''
POSTGRES_DB=''
POSTGRES_PORT=''

PGADMIN_DEFAULT_EMAIL=''
PGADMIN_DEFAULT_PASSWORD=''
PGADMIN_DEFAULT_PORT=''
```

Después se compone el archivo con un objeto con los datos de configuración:

***config.js***

```javascript
require('dotenv').config() // Se importa dotenv que es la librería encargada de leer de un archivo .env y trasladarlo a variables de entorno

const config = { // Se crea el objeto configuración con los datos que tenemos en variables de entorno
    env: process.env.NODE_ENV || 'dev',
    port: process.env.PORT || 3000,
    dbUser: process.env.POSTGRES_USER,
    dbPassword: process.env.POSTGRES_PASSWORD,
    dbHost: process.env.POSTGRES_HOST,
    dbName: process.env.POSTGRES_DB,
    dbPort: process.env.POSTGRES_PORT
}

module.exports = { config } // Se exporta el objeto con los datos de configuración 
```

Con esto ya tenemos la configuración de conexión de una base de datos en Node de Postgres

Por último se protegen los datos en el docker-compose ya que aquí también hay datos delicados.

***docker-compose.yml***

```javascript
services:
    postgres:
        image: postgres:16
        ports:
            - ${POSTGRES_PORT}:${POSTGRES_PORT}
        environment:
            - POSTGRES_DB=${POSTGRES_DB}
            - POSTGRES_USER=${POSTGRES_USER}
            - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
        volumes:
            - ./postgres_data:/var/lib/postgresql/data
    pgadmin:
        image: dpage/pgadmin4
        environment:
            - PGADMIN_DEFAULT_EMAIL=${PGADMIN_DEFAULT_EMAIL}
            - PGADMIN_DEFAULT_PASSWORD=${PGADMIN_DEFAULT_PASSWORD}
        ports:
            - ${PGADMIN_DEFAULT_PORT}:80
```

No es necessario importar niguna librería en este caso para que lea los archivo .env. Ya es algo que docker hace por defecto.

## Clase 9 ¿Qué es un ORM? Instalación y configuración de Sequelize ORM

Ahora se va a empezar a usar un ORM

> Un ORM es un modelo de programación que permite mapear las estructuras de una base de datos relacional (Postgres, SQL Server, Oracle, MySQL, etc.), en adelante RDBMS (Relational Database Management System), sobre una estructura lógica de entidades con el objeto de simplificar y acelerar el desarrollo de nuestras aplicaciones.
> Las estructuras de la base de datos relacional quedan vinculadas con las entidades lógicas o base de datos virtual definida en el ORM, de tal modo que las acciones CRUD (Create, Read, Update, Delete) a ejecutar sobre la base de datos física se realizan de forma indirecta por medio del ORM.

Con este ORM vamos a independizar la capa de BBDD del código, de tal manera que no dependa del tipo de BBDD usada a la hora de ejecutar nuestro código y así poder migrar en un futuro a otra tecnología abstrayendo el código del cambio.

Para ello vamos a usar sequelize (ORM usado en node.js y Typescript).

### 1. Instalamos la dependencia con: npm i --save sequelize

### 2. Necesitamos instalar los drivers que pide sequelize para el tipo de base de datos que usamos, en este caso Postgres necesitamos tanto pg como pg-hstore (pg ya la tenemos importada). Instalamos la dependencia de drivers: npm i --save pg-hstore

### 3. Creamos el js encargado de la conexión con sequelize

```javascript
const { Sequelize } = require('sequelize')

const { config } = require('../config/config')

const USER = encodeURIComponent(config.dbUser)
const PASSWORD = encodeURIComponent(config.dbPassword)
const URI = `postgres://${USER}:${PASSWORD}@${config.dbHost}:${config.dbPort}/${config.dbName}`

const sequelize = new Sequelize(URI, {
    dialect: 'postgres', // Le decimos al tipo de BBDD al que queremos conectar
    logging: true // Nos sacará por consola cada query que hagamos a la BBDD a través del ORM
})

module.exports = sequelize
```

### 4. Por último, usamos el objeto Sequelize para hacer una petición a la BBDDD

```javascript
const sequelize = require('../libs/sequelize')
.
.
.
async find() {
        const query = 'SELECT * FROM tasks ORDER BY id ASC'
        const [data, metadata] = await sequelize.query(query) 
        // Solo es necesario data. Metadata trae información extra que no es necesaria en este caso. Se deja para ver de ejemplo que es lo que trae.
        return {data, metadata} 
    }
```

```json
{
    "data": [
        {
            "id": 1,
            "title": "Tarea 1",
            "completed": false
        },
        {
            "id": 2,
            "title": "Tarea 2",
            "completed": false
        },
        {
            "id": 3,
            "title": "Tarea 3",
            "completed": false
        },
        {
            "id": 4,
            "title": "Tarea 4",
            "completed": false
        },
        {
            "id": 5,
            "title": "Tarea 5",
            "completed": false
        }
    ],
    "metadata": {
        "command": "SELECT",
        "rowCount": 5,
        "oid": null,
        "rows": [
            {
                "id": 1,
                "title": "Tarea 1",
                "completed": false
            },
            {
                "id": 2,
                "title": "Tarea 2",
                "completed": false
            },
            {
                "id": 3,
                "title": "Tarea 3",
                "completed": false
            },
            {
                "id": 4,
                "title": "Tarea 4",
                "completed": false
            },
            {
                "id": 5,
                "title": "Tarea 5",
                "completed": false
            }
        ],
        "fields": [
            {
                "name": "id",
                "tableID": 16409,
                "columnID": 1,
                "dataTypeID": 23,
                "dataTypeSize": 4,
                "dataTypeModifier": -1,
                "format": "text"
            },
            {
                "name": "title",
                "tableID": 16409,
                "columnID": 2,
                "dataTypeID": 1043,
                "dataTypeSize": -1,
                "dataTypeModifier": 254,
                "format": "text"
            },
            {
                "name": "completed",
                "tableID": 16409,
                "columnID": 3,
                "dataTypeID": 16,
                "dataTypeSize": 1,
                "dataTypeModifier": -1,
                "format": "text"
            }
        ],
        "_parsers": [
            null,
            null,
            null
        ],
        "_types": {
            "_types": {},
            "text": {},
            "binary": {}
        },
        "RowCtor": null,
        "rowAsArray": false,
        "_prebuiltEmptyResultObject": {
            "id": null,
            "title": null,
            "completed": null
        }
    }
}
```

## Clase 10 ¿Qué es un ORM? Instalación y configuración de Sequelize ORM

Ahora vamos a crear los modelos de las tablas de BBDD en el código. De esta manera independizamos la base de datos del código, dejando al ORM que se encargue de traducir estos modelos a la BBDD del tipo que nos permita. Por otro lado también se van a hacer las llamadas a la BBDD sin utilizar la query utilizando los métodos que nos permite el ORM.

Primero creamos el modelo de la tabla 'User'

***./api/db/models/user.models.js***

```javascript
const { Model, DataTypes, Sequelize } = require('sequelize')

const USER_TABLE = 'users'

const UserSchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    email: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true
    },
    password: {
        allowNull: false,
        type: DataTypes.STRING
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW
    }
}

class User extends Model { // Necesario extender de la clase Model que nos aporta los métodos que necesitamos
    static associate() {} // Al ser static no necesitamos crear el objeto para hacer uso del método
    static config(sequelize) {
        return {
            sequelize,
            tableName: USER_TABLE, // Nombre de la tabla en BBDD
            modelName: 'User', // Nombre de la tabla en el modelo usado en Javascript
            timestamps: false
        }
    }
}

module.exports = { USER_TABLE, UserSchema, User }
```

Ahora creamos un archivo encargado de recopilar todos los modelos y añadirle el objeto sequelize.

Aquí se irán añadiendo los modelos según se vayan creando.

***./api/db/models/index.js***

```javascript
const { User, UserSchema } = require('./user.model')

function setupModels(sequelize) {
    User.init(UserSchema, User.config(sequelize))
}

module.exports = setupModels
```

Por terminar se modifica el archivo sequelize.js para funcionar con los modelos. Para ello, simplemente se importa el setupModels creado y se llama a la función pasándole el objeto sequelize que acabamos de crear. Por último, se llama a la función sync de sequelize para que al conectar sincronice con la BBDD los modelos creados.

***./api/libs/sequelize.js***

```javascript
const setupModels = require('../db/models/index')

setupModels(sequelize)

sequelize.sync()
```

Ahora ya podemos usar el modelo de 'users' para hacer llamadas en vez de usar las query.

***./api/service/user.service.js***

```javascript
const { models } = require('../libs/sequelize')

async find() {
    const rta = await models.User.findAll()
    return rta
}
```

## Clase 11 Crear, actualizar y eliminar

Ahora vamos a crear el CRUD de los usuarios (acrónimo de "Crear, Leer, Actualizar y Borrar") de la API mediante sequelize. Para ello vamos a modificar el servicio de usuarios adaptándolo a sequelize y sus métodos.

***./api/service/user.service.js***

```Javascript
class UserService {
    constructor() {}

    async create(data) {
        const newUser = await models.User.create(data) // Usamos el método create de sequelize
        return newUser
    }

    async find() {
        const rta = await models.User.findAll() 
        return rta
    }

    async findOne(id) {
        const user = await models.User.findByPk(id) // Usamos el método findByPk de sequelize
        if (!user) throw boom.notFound('User not found')
        return user
    }

    async update(id, changes) {
        const user = await this.findOne(id) // Al tener ya creado el método findOne lo reutilizamos para que ese método capture los errores y así reutilizar código
        const rta = await user.update(changes)
        return rta
    }

    async delete(id) {
        const user = await this.findOne(id) // Al tener ya creado el método findOne lo reutilizamos para que ese método capture los errores y así reutilizar código
        await user.destroy()
        return { id }
    }
}
```

## Clase 12 Cambiando la base de datos a MySQL

Para demostrar la capacidad del ORM de hacer agnóstico el código de la base de datos usada, se va a cambiar la BBDD de Postgres a Mysql. Además mediante variables de entorno se podrá elegir fácilmente entre ambas BBDD.

Antes de nada (sin tener que ver con el cambio de base de datos) se va a crear un handler para tratar los errores que vienen del sequelize.

Primero se crea el handler que trata los errores.

***./api/middlewares/error.handler.js***

```javascript
function ormErrorHandler(err, req, res, next) {
    if (err instanceof ValidationError) {
        res.status(409).json({
            statusCode: 409,
            message: err.name,
            errors: err.errors
        })
    } else {
        next(err)
    }
}
```

Lo agregamos al index en el orden que queremos que se traten los errores.

***./api/index.js***

```javascript
const {
    logErrors,
    errorHandler,
    boomErrorHandler,
    ormErrorHandler
} = require('./middlewares/error.handler')

app.use(logErrors)
app.use(ormErrorHandler)
app.use(boomErrorHandler)
app.use(errorHandler)

```

Una vez hecho esto, vamos a adaptar el código para el cambio de BBDD.

Primero vamos a crear el docker-compose con la base de datos de Mysql y su interfaz gráfica con phpmyadmin

***./docker-compose.yml***

```yml
    mysql:
        image: mysql:5
        environment:
            - MYSQL_DATABASE=${MYSQL_DATABASE}
            - MYSQL_USER=${MYSQL_USER}
            - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
            - MYSQL_PORT=${MYSQL_PORT}
        ports:
            - ${MYSQL_PORT}:${MYSQL_PORT}
        volumes:
            - ./mysql_data:/var/lib/mysql
    phpmyadmin:
        image: phpmyadmin/phpmyadmin
        environment:
            - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
            - PMA_HOST=mysql
        ports:
            - ${PHPMYADMIN_PORT}:80

```

Estas nuevas variables de entorno se agregan al archivo .env. También se agrega una variable 'DB_TYPE' donde diremos que BBDD vamos a usar

***./.env***

```yml
PORT = 

DB_TYPE =''

POSTGRES_USER=''
POSTGRES_PASSWORD=''
POSTGRES_HOST=''
POSTGRES_DB=''
POSTGRES_PORT=''

MYSQL_DATABASE=''
MYSQL_USER=''
MYSQL_HOST=''
MYSQL_ROOT_PASSWORD=''
MYSQL_PORT=''

PGADMIN_DEFAULT_EMAIL=''
PGADMIN_DEFAULT_PASSWORD=''
PGADMIN_DEFAULT_PORT=''

PHPMYADMIN_PORT=''
```

Actualizamos el archivo config con las nueva configuración de variables

***./config/config.js***

```javascript
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
```

Ahora levantamos el docker con docker-compose up -d

En el caso de mysql me he encontrado con un par de fallos a la hora de conectar.

- El puerto ya estaba en uso (típicamente se usa el puerto 3306). La solución que me ha funcionado para esto es matar el proceso que está usando el puerto con: netstat -aon | findstr :3306 (para ver el id del proceso en uso) y taskkill /pid IdTASK /F (para matar el proceso)
- Que el usuario y contraseña no te los reconozca como correctos. Se usa el usuario root. En caso de que con root tampoco funcione, he visto usuarios que les funciona dejando vacío el campo usuario.

Y ya por último actualizamos el archivo sequelize con la lógica para conectar a la nueva BBDD. Para ello antes necesitamos importar la **librería driver para mysql** con: **npm i --save mysql2**

***./libs/sequelize.js***

```javascript
let URI = ''

if (config.dbType == 'postgres') { // Según lo que pongamos en la variable dbTypes construye la conexión para esa BBDD
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
    dialect: config.dbType, // Ahora indicamos con variable de entorno el tipo de variable
    logging: true
})

```

De esta manera queda configurado nuestro proyecto para funcionar con BBDD Mysql o Postgres solo cambiando la variable de entorno dbType.

## Clase 13 ¿Qué son las migraciones? Migraciones en Sequelize ORM

Básicamente, las migraciones mantienen el historial del esquema que se lleva en la base de datos. Es un sistema muy usado en ambientes de producción para trackear los cambios sin tener que replicar todo nuevamente (creación de tablas, llaves foráneas, etc). Es decir, permite saber en qué punto estaba para saber qué es lo que se tiene que modificar.

sequelize.sync() empieza a leer los modelos, crea tablas y hace relist (se sobrescribe información), no se aconseja que se corra en producción. Es mejor sincronizar con un sistema de migraciones.

Primero vamos a instalar la dependencia necesaria para utilizar migraciones con sequelize con el comando: npm i sequelize-cli -D

Después creamos un archivo en la raiz de configuración inicial para sequelize

***.sequelizerc***

```javascript
module.exports = {
    config: './api/db/config.js', //Donde vamos a tener la configuración de la BBDD
    'models-path': './api/db/models/', //Donde vamos a tener la inicialización de los modelos
    'migrations-path': './api/db/migrations/', //Donde vamos a tener el historial de migraciones
    'seeders-path': './api/db/seeders/' //Donde vamos a tener las semillas
}
```

Por último, se crean las carpetas en las url que hemos configurado en el archivo anterior y el archivo config.js con el siguiente contenido:

***./db/config.js***

```javascript
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
```

## Clase 14 Configurando y corriendo migraciones con npm scripts

***Este apunte del sync de sequelize no me doy cuenta hasta la clase 16 de no haberlo quitado pero lo dejo en esta clase aunque en el código de esta clase está puesto, es un error***
Antes de nada quitamos el sync de la configuración de sequelize en el archivo ***api\libs\sequelize.js***, eliminando la llamada a la función ***sequelize.sync()***. De esta manera ya no sincronizará al iniciar el run dev y todo lo hará por migraciones.

Lo primero es crear el script de creación de la tabla incial. Para ello lo añadimos al package.json

```JSON
  "scripts": {
    "dev": "nodemon api/index.js",
    "start": "node api/index.js",
    "lint": "eslint",
    "migrations:generate": "sequelize-cli migration:generate --name" // --name es el nombre que le queramos dar a la nueva migración
  },
```

Una vez lo tenemos ejecutamos el script: ***npm run migrations:generate create-user***

Esto nos va a crear un archivo en la carpeta migraciones (ruta que configuramos en el archivo de configuración) con un stamp de fecha y el nombre que le hemos pasado por el comando. En este caso crea el archivo ***api\db\migrations\20240718164244-create-user.js***

Este archivo se crea con un esqueleto base que debemos rellenar con los cambios de la migración. Añadimos al archivo creado lo siguiente:

```javascript
'use strict'

const { UserSchema, USER_TABLE } = require('./../models/user.model')
module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable(USER_TABLE, UserSchema)
    },

    async down(queryInterface) {
        await queryInterface.drop(USER_TABLE)
    }
}
```

Ahora creamos el resto de script en el package.json

```JSON
  "scripts": {
    "dev": "nodemon api/index.js",
    "start": "node api/index.js",
    "lint": "eslint",
    "migrations:generate": "sequelize-cli migration:generate --name", // --name es el nombre que le queramos dar a la nueva migración
    "migrations:run": "sequelize-cli db:migrate", // Corre las migraciones pendientes
    "migrations:revert": "sequelize-cli db:migrate:undo", // Deshace la última migración
    "migrations:delete": "sequelize-cli db:migrate:undo:all" // Deshace todas las migraciones
  }
```

Ahora tenemos listo para empezar con las migraciones, para ello usamos el script ***migrations:run***

Esto crea en la base la configuración de tablas que le hemos añadido al archivo de la migración
Además crea una tabla historial de las migraciones que hemos añadido a BBDD para en posteriores migraciones no añadirlas y seguir con las siguientes.

## Clase 15 Modificando una entidad

Para probar a modificar la tabla y crear una migración modificamos la tabla user añadiendo un atributo más (atributo role):

***user.model.js***

```javascript
  const UserSchema = {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    email: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true
    },
    password: {
        allowNull: false,
        type: DataTypes.STRING
    },
    role: {
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'customer'
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW
    }
}
```

Generamos una nueva migración con el comando ***npm run migrations:generate add-role***. Esto nos crea un nuevo archivo de migración que vamos a modificar:

```javascript
'use strict'

const { UserSchema, USER_TABLE } = require('../models/user.model')

module.exports = {
    async up(queryInterface) {
        await queryInterface.addColumn(USER_TABLE, 'role', UserSchema.role)
    },

    async down(queryInterface) {
        await queryInterface.removeColumn(USER_TABLE, 'role')
    }
}
```

> Si elimináramos todas las migraciones y volviéramos a ejecutar nos diría que ya tiene el campo role al intentar ejecutar esta migración. Esto es debido a que en la migración de crear user le indicamos el model, y ahora al haber añadido el campo role lo crearía en la primera migración. Esto no se muy bien como sería la forma correcta de hacerlo pero las opciones que se me ocurren son:***
>
> - Indicar solo los campos a crear y no todo el modelo (ineficiente)
> - No agregar al modelo los campos que se ejecutan en migraciones (Esto a la larga deja atrasado el código)

Ahora ya podemos ejecutar el script ***npm run migrations:run*** y solo efectuará los cambios de la migración que aún no ha actualizado. Si volviéramos a ejecutar el comando nos dirá que no hay migraciones nuevas.

También para requerir el dato role cuando se introduzca como obligatorio vamos a modificar el schema.

***user.schema.js***

```javascript
const Joi = require('joi')

const id = Joi.number().integer()
const email = Joi.string().email()
const password = Joi.string().min(8)
const role = Joi.string().min(5)

const createUserSchema = Joi.object({
    email: email.required(),
    password: password.required(),
    role: role.required()
})

const updateUserSchema = Joi.object({
    email: email,
    role: role
})

const getUserSchema = Joi.object({
    id: id.required()
})

module.exports = { createUserSchema, updateUserSchema, getUserSchema }
```

Con esto ya tenemos la migración en la base de datos y si probamos a introducir un nuevo elemento en la tabla con postman nos pedirá como obligatorio el atributo role.

## Clase 16 Relaciones uno a uno

Para empezar a crear una relación uno a uno (la más básica de todas) lo primero es crear el modelo de customer en la base de datos. Para ello rellenamos el modelo:

***./api/db/models/customer.model.js***

```javascript
const { Model, DataTypes, Sequelize } = require('sequelize')

const CUSTOMER_TABLE = 'customers'

const CustomerSchema = {
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    name: { allowNull: false, type: DataTypes.STRING },
    lastName: { allowNull: false, type: DataTypes.STRING, field: 'last_name' },
    phone: { allowNull: true, type: DataTypes.STRING },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW
    }
}
class Customer extends Model {
    static associate() {}
    static config(sequelize) {
        return { sequelize, tableName: CUSTOMER_TABLE, modelName: 'Customer', timestamps: false }
    }
}
module.exports = { Customer, CustomerSchema, CUSTOMER_TABLE }
```

Después agregamos el modelo a la configuración inicial de la base de datos:

***./api/db/index.js***

```javascript
const { User, UserSchema } = require('./user.model')
const { Customer, CustomerSchema } = require('./customer.model')

function setupModels(sequelize) {
    User.init(UserSchema, User.config(sequelize))
    Customer.init(CustomerSchema, Customer.config(sequelize))
}

module.exports = setupModels
```

Y le creamos el service, routes y schema de entrada:

***./api/services/customer.service.js***

```javascript
const boom = require('@hapi/boom')

const { models } = require('../libs/sequelize')

class CustomerService {
    constructor() {}

    async find() {
        const rta = await models.Customer.findAll()
        return rta
    }

    async findOne(id) {
        const user = await models.Customer.findByPk(id)
        if (!user) {
            throw boom.notFound('customer not found')
        }
        return user
    }

    async create(data) {
        return data
    }

    async update(id, changes) {
        const model = await this.findOne(id)
        const rta = await model.update(changes)
        return rta
    }

    async delete(id) {
        const model = await this.findOne(id)
        await model.destroy()
        return { rta: true }
    }
}
module.exports = CustomerService

```

***./api/routes/customer.router.js***

```javascript
const express = require('express')

const CustomerService = require('../services/customer.service')
const { validatorHandler } = require('../middlewares/validator.handler')
const {
    createCustomerSchema,
    getCustomerSchema,
    updateCustomerSchema
} = require('../schemas/customer.schema')

const router = express.Router()
const service = new CustomerService()

router.get('/', async (req, res, next) => {
    try {
        res.json(await service.find())
    } catch (error) {
        next(error)
    }
})

router.post('/', validatorHandler(createCustomerSchema, 'body'), async (req, res, next) => {
    try {
        const body = req.body
        res.status(201).json(await service.create(body))
    } catch (error) {
        next(error)
    }
})

router.patch(
    '/:id',
    validatorHandler(getCustomerSchema, 'params'),
    validatorHandler(updateCustomerSchema, 'body'),
    async (req, res, next) => {
        try {
            const { id } = req.params
            const body = req.body
            res.status(201).json(await service.update(id, body))
        } catch (error) {
            next(error)
        }
    }
)

router.delete('/:id', validatorHandler(getCustomerSchema, 'params'), async (req, res, next) => {
    try {
        const { id } = req.params
        res.status(200).json(await service.delete(id))
    } catch (error) {
        next(error)
    }
})

module.exports = router
```

Añadimos al index.js de los routers la nueva ruta a customers:

***./api/routes/index.js***

```javascript
const express = require('express')

const productsRouter = require('./products.router')
const categoriesRouter = require('./categories.router')
const usersRouter = require('./users.router')
const customersRouter = require('./customer.router')

function routerApi(app) {
    const router = express.Router()

    app.use('/api/v1', router)
    router.use('/products', productsRouter)
    router.use('/categories', categoriesRouter)
    router.use('/users', usersRouter)
    router.use('/customers', customersRouter)
}

module.exports = routerApi

```

***./api/routes/customer.schema.js***

```javascript
const Joi = require('joi')

const id = Joi.number().integer()
const name = Joi.string().min(3).max(30)
const lastName = Joi.string()
const phone = Joi.string()

const getCustomerSchema = Joi.object({ id: id.required() })

const createCustomerSchema = Joi.object({
    name: name.required(),
    lastName: lastName.required(),
    phone: phone.required()
})

const updateCustomerSchema = Joi.object({ name, lastName, phone })

module.exports = { getCustomerSchema, createCustomerSchema, updateCustomerSchema }

```

Ahora una vez creado todo lo necesario para nuestro modelo de customer vamos a crear la relación entre customer y usuario. Para ello hacemos lo siguiente:

- Añadimos un metodo associate al modelo del customer:

***./api/routes/customer.schema.js***

```javascript

(...)

class Customer extends Model {
    static associate(models) {
        this.belongsTo(models.User, { as: 'user' })
    }
    static config(sequelize) {
        return { sequelize, tableName: CUSTOMER_TABLE, modelName: 'Customer', timestamps: false }
    }
}

(...)

```

Y llamamos a esta función pasándole el modelo en el index.js de los models para la configuración inicial

***./api/routes/customer.schema.js***

```javascript

(...)

function setupModels(sequelize) {
    User.init(UserSchema, User.config(sequelize))
    Customer.init(CustomerSchema, Customer.config(sequelize))

    Customer.associate(sequelize.models)
}

(...)

```

También añadimos al schema del modelo el id que se va a usar:

```javascript

(...)

const { USER_TABLE } = require('./user.model')

(...)

    userId: {
        field: 'user_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        unique: true,
        references: { model: USER_TABLE, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    }

(...)

```

Una vez hecho todo esto, necesitamos crear la migración para este cambio en la bbdd. Para ello usamos el comando: ***npm run migrations:generate create-customers*** y lo modificamos:

```javascript
'use strict'

const { CustomerSchema, CUSTOMER_TABLE } = require('./../models/customer.model')

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable(CUSTOMER_TABLE, CustomerSchema)
    },

    async down(queryInterface) {
        await queryInterface.drop(CUSTOMER_TABLE)
    }
}
```

Y por último ejecutamos el comando ***npm run migrations:run*** para que detecte y añada los cambios de la última migración.

Una vez creado en base de datos, nos falta validar este dato cuando creamos un nuevo customer, para ello añadimos el nuevo campo al schema:

***api\schemas\customer.schema.js***

```javascript

(...)

const createCustomerSchema = Joi.object({
    name: name.required(),
    lastName: lastName.required(),
    phone: phone.required(),
    userId: userId.required()
})

const updateCustomerSchema = Joi.object({ name, lastName, phone, userId })

(...)

```

Y completamos la función de creación del nuevo customer en el servicio:

***api\services\customer.service.js***

```javascript

(...)

    async create(data) {
        const newCustomer = await models.Customer.create(data)

        return newCustomer
    }

(...)

```

Ya tenemos todo para poder crear customers con relación al usuario con Postman y verlo en PGAdmin

## Clase 17 Resolviendo las relaciones uno a uno

Antes de empezar esta clase hacemos una corrección de un bug encontrado en clases anteriores:

Las migraciones de creación de tablas anteriores tenían un error en las funciones down, no deberían hacer un drop sino un dropTable:

***api\db\migrations\20240718164244-create-user.js***

```javascript
'use strict'

const { UserSchema, USER_TABLE } = require('./../models/user.model')
module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable(USER_TABLE, UserSchema)
    },

    async down(queryInterface) {
        await queryInterface.dropTable(USER_TABLE)
    }
}
```

***api\db\migrations\20240719171041-create-customers.js***

```javascript
'use strict'

const { CustomerSchema, CUSTOMER_TABLE } = require('./../models/customer.model')

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable(CUSTOMER_TABLE, CustomerSchema)
    },

    async down(queryInterface) {
        await queryInterface.dropTable(CUSTOMER_TABLE)
    }
}
```

Ahora si para esta clase se va a añadir una migración para añadir el campo unique a la columna user_id de la tabla costumers. Como en este proyecto ya lo habíamos agregado simplemente dejo el código de la migración aquí para ver como se hace un "changeColumn" en una migración pero no se va a implementar en el código.

```javascript

'use strict'
const { DataTypes } = require('sequelize')

const { CUSTOMER_TABLE } = require('./../models/customer.model')

module.exports = {
    up: async (queryInterface) => {
        await queryInterface.changeColumn(CUSTOMER_TABLE, 'user_id', {
            field: 'user_id',
            allowNull: false,
            type: DataTypes.INTEGER,
            unique: true
        })
    },

    down: async (queryInterface) => {
        // await queryInterface.dropTable(CUSTOMER_TABLE);
    }
}

```

Ahora para que en la respuesta que nos da desde bbdd nos devuelva también la asociación incluida en la respuesta (ej: que customer incluya la info del usuario asociado o viceversa) vamos a hacer lo siguiente:

Como ya teniamos la asociación creada en el ***customer.model.js***

```javascript

    static associate(models) {
        this.belongsTo(models.User, { as: 'user' })
    }

```

Podemos decirle en el ***customer.service.js*** que incluya esa asociación. Se le pasa un array con todas las asociaciones que queremos que incluya en la búsqueda. En este caso solo queremos la asociación con user (definida como 'user' en el modelo):

```javascript

    async find() {
        const rta = await models.Customer.findAll({
            include: ['user']
        })
        return rta
    }

```

Esto ya devolvería en postman la asociación desde customer:

```JSON

[
    {
        "id": 2,
        "name": "Sebastian",
        "lastName": "Molina",
        "phone": "685487541",
        "createdAt": "2024-07-20T10:14:49.534Z",
        "userId": 1,
        "user": {
            "id": 1,
            "email": "prueba4@prueba.com",
            "password": "1209463635232522625",
            "role": "admin",
            "createdAt": "2024-07-20T10:14:31.391Z"
        }
    }
]

```

Para el caso del usuario hacemos lo mismo:

Agregamos la asociación en el modelo del usuario  (en este caso no estaba hecha). En este caso al estar la relación del lado del customer tenemos que decirle la foreignKey:

***api\db\models\user.model.js***

```javascript

    static associate(models) {
        this.hasOne(models.Customer, {
            as: 'customer',
            foreignKey: 'userId'
        })
    }

```

Agregamos la asociación al index.js de la configuración de los modelos

***api\db\models\index.js***

```javascript

function setupModels(sequelize) {
    User.init(UserSchema, User.config(sequelize))
    Customer.init(CustomerSchema, Customer.config(sequelize))

    User.associate(sequelize.models)
    Customer.associate(sequelize.models)
}

```

Por último, completamos el find en el servicio de user:

***api\services\user.service.js***

```javascript

    async find() {
        const rta = await models.User.findAll({
            include: ['customer']
        })
        return rta
    }

```

Esto ya devolvería en postman la asociación desde user:

```JSON

[
    {
        "id": 1,
        "email": "prueba4@prueba.com",
        "password": "1209463635232522625",
        "role": "admin",
        "createdAt": "2024-07-20T10:14:31.391Z",
        "customer": {
            "id": 2,
            "name": "Sebastian",
            "lastName": "Molina",
            "phone": "685487541",
            "createdAt": "2024-07-20T10:14:49.534Z",
            "userId": 1
        }
    }
]

```

Ahora si lo que queremos es relacionar a la hora de crear, por ejemplo, al crear un costumer que automáticamente podamos enviar el usuario al que se asocia sin tener que crearlo previamente, haremos lo siguiente:

Primero modificamos el schema del customer para que requerir nuevos datos, sin usar el userId (deberíamos conocerlo previamente y antes crear el usuario. Ahora lo hacemos directamente en el mismo endpoint).

***api\schemas\customer.schema.js***

```javascript
const id = Joi.number().integer()
const name = Joi.string().min(3).max(30)
const lastName = Joi.string()
const phone = Joi.string()
const userId = Joi.number().integer()
const email = Joi.string().email()
const password = Joi.string()

const getCustomerSchema = Joi.object({ id: id.required() })

const createCustomerSchema = Joi.object({
    name: name.required(),
    lastName: lastName.required(),
    phone: phone.required(),
    user: Joi.object({
        email: email.required(),
        password: password.required()
    })
})
```

Ahora nos vamos al servicio para realizar la lógica:

***api\services\customer.service.js***

```javascript
    async create(data) {
        const newUser = await models.User.create(data.user)
        const newCustomer = await models.Customer.create({
            ...data, //Se le puede enviar todos los datos. Los atributos que no coincidan los va a ignorar
            userId: newUser.id
        })

        return newCustomer
    }
```

Ahora ya podemos enviar los datos con postman y creará tanto el costumer como el usuario asociado:

```JSON
{
    "name": "Sebastian",
    "lastName": "Molina",
    "phone": "685487541",
    "user": {
        "email": "santi@email.com",
        "password": "1234"
    }
}
```

Y nos devuelve el costumer con el usuario y su id asociado:

```JSON
{
    "createdAt": "2024-08-09T17:56:41.470Z",
    "id": 1,
    "name": "Sebastian",
    "lastName": "Molina",
    "phone": "685487541",
    "userId": 1
}
```

Existe una forma de simplificar el código gracias a sequelize:

En el servicio podemos pasar todos los datos y gracias a la asociación que ya tenemos definida sequelize va a crear también el usuario. Solo tenemos que indicarle explícitamente que incluya el user:

***api\services\customer.service.js***

```javascript
    async create(data) {
        const newCustomer = await models.Customer.create(data, {
            include: ['user']
        })

        return newCustomer
    }
```

De esta manera ahora postman mandando la misma información nos devuelve la asociación más completa:

```JSON
{
    "createdAt": "2024-08-09T18:13:28.297Z",
    "id": 3,
    "name": "José",
    "lastName": "Molina",
    "phone": "685487541",
    "user": {
        "role": "customer",
        "createdAt": "2024-08-09T18:13:28.297Z",
        "id": 3,
        "email": "jose@email.com",
        "password": "1234"
    },
    "userId": 3
}
```

## Clase 18 Relaciones uno a muchos

Ahora vamos a hacer lo mismo pero en relaciones uno a muchos. Para ello vamos a hacer que una categoría tenga muchos productos, pero un producto solo tiene una categoría.

En primer lugar completamos el schema de producto:

***api\schemas\product.schema.js***

```javascript
    const Joi = require('joi')

    const id = Joi.string().uuid()
    const name = Joi.string().min(3).max(15)
    const price = Joi.number().integer().min(10)
    const description = Joi.string().min(10)
    const image = Joi.string().uri()

    const createProductSchema = Joi.object({
        name: name.required(),
        price: price.required(),
        description: description.required(),
        image: image.required()
    })

    const updateProductSchema = Joi.object({
        name: name,
        price: price,
        image: image,
        description
    })

    const getProductSchema = Joi.object({
        id: id.required()
    })

    module.exports = { createProductSchema, updateProductSchema, getProductSchema }
```

También creamos los modelos tanto de category como de product:

***api\db\models\product.model.js***

```javascript
    const { Model, DataTypes, Sequelize } = require('sequelize')

    const PRODUCT_TABLE = 'products'

    const ProductSchema = {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        name: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        image: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        price: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        createdAt: {
            allowNull: false,
            type: DataTypes.DATE,
            field: 'created_at',
            defaultValue: Sequelize.NOW
        }
    }

    class Product extends Model {
        static associate(models) {}
        static config(sequelize) {
            return { sequelize, tableName: PRODUCT_TABLE, modelName: 'Product', timestamps: false }
        }
    }

    module.exports = { Product, ProductSchema, PRODUCT_TABLE }
```

***api\db\models\category.model.js***

```javascript
    const { Model, DataTypes, Sequelize } = require('sequelize')

    const CATEGORY_TABLE = 'categories'

    const CategorySchema = {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        name: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        image: {
            type: DataTypes.STRING,
            allowNull: false
        },
        createdAt: {
            allowNull: false,
            type: DataTypes.DATE,
            field: 'created_at',
            defaultValue: Sequelize.NOW
        }
    }

    class Category extends Model {
        static associate(models) {}
        static config(sequelize) {
            return { sequelize, tableName: CATEGORY_TABLE, modelName: 'Category', timestamps: false }
        }
    }

    module.exports = { Category, CategorySchema, CATEGORY_TABLE }

```

Ahora vamos a crear la asociación. Para ello primero agregamos el atributo de categoría al producto necesario (categoryId) para asociación y añadimos el associate

***api\db\models\product.model.js***

```javascript

(...)

    const { CATEGORY_TABLE } = require('./category.model')

(...)
    },
    categoryId: {
        field: 'category_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: { model: CATEGORY_TABLE, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'

(...)

    static associate(models) {
        this.belongsTo(models.Category, {
            as: 'category'
        })
    }

(...)

```

Y también añadimos el associate a la categoría:

***api\db\models\category.model.js***

```javascript

(...)

    static associate(models) {
        this.hasMany(models.Product, {
            as: 'products',
            foreignKey: 'categoryId'
        })
    }

(...)
    
```

Y ya por último lo añadimos al index de configuración de modelos:

```javascript

(...)

const { Category, CategorySchema } = require('./category.model')
const { Product, ProductSchema } = require('./product.model')

(...)
    Category.init(CategorySchema, Category.config(sequelize))
    Product.init(ProductSchema, Product.config(sequelize))

(...)

    Category.associate(sequelize.models)
    Product.associate(sequelize.models)

(...)

```

El último paso que queda sería crear la migración para añadir las 2 tablas con sus relaciones. Para ello ejecutamos el comando 'npm run migrations:generate products' y dentro añadimos los siguiente:

```javascript

'use strict'

const { CategorySchema, CATEGORY_TABLE } = require('./../models/category.model')
const { ProductSchema, PRODUCT_TABLE } = require('./../models/product.model')

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable(CATEGORY_TABLE, CategorySchema)
        await queryInterface.createTable(PRODUCT_TABLE, ProductSchema)
    },

    async down(queryInterface) {
        await queryInterface.dropTable(CATEGORY_TABLE)
        await queryInterface.dropTable(PRODUCT_TABLE)
    }
}

```

Ejecutamos el comando 'npm run migrations:run' y ya tenemos las tablas en la base de datos y sus relaciones.

## Clase 19 Resolviendo relaciones uno a muchos

Vamos a resolver las creaciones de esos productos asociados a una categoría. Para ello lo primero es poder crear categorías. Completamos la función create del servicio de categorías:

***api\services\category.service.js***

```javascript

(...)

const { models } = require('../libs/sequelize')

(...)

async create(data) {
    const newCategory = await models.Category.create(data)
    return newCategory
    }

(...)

```

Ahora podemos llamar al endpoint mediante postman para crear con post una categoría:

Enviando:

```JSON

{
    "name": "Category 1",
    "image": "http://placeimg.com/640/480"
}

```

Recibimos:

```JSON

{
    "createdAt": "2024-08-10T20:13:25.601Z",
    "id": 1,
    "name": "Category 1",
    "image": "http://placeimg.com/640/480"
}

```

Vamos a hacer lo mismo ahora con los productos:

***api\services\products.services.js***

```javascript

(...)

const { models } = require('../libs/sequelize')

(...)

async create(data) {
    const newProduct = await models.Product.create(data)
    return newProduct
}

async find() {
    const products = await models.Product.findAll()
    return products
}

(...)

```

También se necesita modificar el schema para que ahora sea necesario mandar un categoryId al crear un producto:

***api\schemas\product.schema.js***

```javascript

const categoryId = Joi.number().integer()

const createProductSchema = Joi.object({
    name: name.required(),
    price: price.required(),
    description: description.required(),
    image: image.required(),
    categoryId: categoryId.required()
})

const updateProductSchema = Joi.object({
    name: name,
    price: price,
    image: image,
    description: description,
    categoryId: categoryId
})

```

Añadimos al servicio del producto que nos devuelva en el find la categoría anidada:

***api\services\products.services.js***

```javascript

async find() {
    const products = await models.Product.findAll({ include: ['category'] })
    return products
}

```

Ahora si llamamos al get con postman nos devolverá la categoría anidada:

```JSON

[
    {
        "id": 2,
        "name": "23asdasd",
        "image": "http://placeimg.com/640/480",
        "description": "asda sdfsdf sdf sdf sdf a",
        "price": 1209,
        "createdAt": "2024-08-11T18:06:13.704Z",
        "categoryId": 3,
        "category": {
            "id": 3,
            "name": "Category 2",
            "image": "http://placeimg.com/640/480",
            "createdAt": "2024-08-11T18:03:06.518Z"
        }
    },
    {
        "id": 7,
        "name": "23asaddawwsd",
        "image": "http://placeimg.com/640/480",
        "description": "asda sdfsdf sdf sdf sdf a",
        "price": 1209,
        "createdAt": "2024-08-11T18:09:01.395Z",
        "categoryId": 3,
        "category": {
            "id": 3,
            "name": "Category 2",
            "image": "http://placeimg.com/640/480",
            "createdAt": "2024-08-11T18:03:06.518Z"
        }
    }
]
```

Ahora vamos hacer lo propio para categorías y que devuelva solo las categorías en el endpoint de buscar todas las categorías pero en el de una en concreto nos devuelva todos los productos anidados:

***api\services\category.service.js***

```javascript

async find() {
    const categories = await models.Category.findAll()
    return categories
}

async findOne(id) {
    const category = await models.Category.findByPk(id, { include: ['products'] })
    return category
}
```

## Clase 20 Órdenes de compra

Vamos a crear una nueva tabla que va a ser "Orders". Esta tabla la vamos a usar para una relación muchos a muchos:

***api\db\models\order.model.js***

```javascript

const { Model, DataTypes, Sequelize } = require('sequelize')

const { CUSTOMER_TABLE } = require('./customer.model')

const ORDER_TABLE = 'orders'

const OrderSchema = {
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    customerId: {
        field: 'customer_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: { model: CUSTOMER_TABLE, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW
    }
}
class Order extends Model {
    static associate(models) {
        this.belongsTo(models.Customer, { as: 'customer' }) // Una order pertenece a 1 customer
    }
    static config(sequelize) {
        return { sequelize, tableName: ORDER_TABLE, modelName: 'Order', timestamps: false }
    }
}
module.exports = { Order, OrderSchema, ORDER_TABLE }

```

Le agregamos la asociación también al modelo de customer (un customer puede tener muchas orders):

***api\db\models\customer.model.js***

```javascript

static associate(models) {
    this.belongsTo(models.User, { as: 'user' })
    this.hasMany(models.Order, {
        as: 'orders',
        foreignKey: 'customerId'
    })
}

```

Y por último iniciamos el modelo y las asociaciones en sequelize:

***api\db\models\index.js***

```javascript

const { Order, OrderSchema } = require('./order.model')

function setupModels(sequelize) {
    User.init(UserSchema, User.config(sequelize))
    Customer.init(CustomerSchema, Customer.config(sequelize))
    Category.init(CategorySchema, Category.config(sequelize))
    Product.init(ProductSchema, Product.config(sequelize))
    Order.init(OrderSchema, Order.config(sequelize))

    User.associate(sequelize.models)
    Customer.associate(sequelize.models)
    Category.associate(sequelize.models)
    Product.associate(sequelize.models)
    Order.associate(sequelize.models)
}

```

Ahora necesitamos hacer la migración para agregar la nueva tabla a la base de datos. Para ello ejecutamos el comando 'npm run migrations:generate order'.

***api\db\migrations\20240813141409-order.js***

```javascript
'use strict'

const { OrderSchema, ORDER_TABLE } = require('./../models/order.model')

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable(ORDER_TABLE, OrderSchema)
    },

    async down(queryInterface) {
        await queryInterface.dropTable(ORDER_TABLE)
    }
}

```

Vamos a completar el servicio de order:

***api\services\order.service.js***

```javascript

const { models } = require('../libs/sequelize')

(...)

async create(data) {
    const newOrder = await models.Order.create(data)
    return newOrder
}

(...)

async findOne(id) {
        const order = await models.Order.findByPk(id, {
            include: [
                {
                    association: 'customer', 
                    include: ['user'] // Esta es una forma de hacer muchos subniveles de anidación (orders que devulve a su vez customer y a su vez usuario)
                }
            ]
        })
        return order
    }

(...)

```

También completamos el schema:

***api\schemas\order.schema.js***

```javascript

const Joi = require('joi')

const id = Joi.number().integer()
const customerId = Joi.number().integer()

const getOrderSchema = Joi.object({ id: id.required() })

const createOrderSchema = Joi.object({ customerId: customerId.required() })

module.exports = { getOrderSchema, createOrderSchema }

```

Por último completamos el router para poder acceder a los endpoints:

***api\routes\orders.router.js***

```javascript

const express = require('express')

const OrderService = require('../services/order.service')
const { validatorHandler } = require('../middlewares/validator.handler')
const { getOrderSchema, createOrderSchema } = require('../schemas/order.schema')

const router = express.Router()
const service = new OrderService()

router.get('/:id', validatorHandler(getOrderSchema, 'params'), async (req, res, next) => {
    try {
        const { id } = req.params
        const order = await service.findOne(id)
        res.json(order)
    } catch (error) {
        next(error)
    }
})

router.post('/', validatorHandler(createOrderSchema, 'body'), async (req, res, next) => {
    try {
        const body = req.body
        const newOrder = await service.create(body)
        res.status(201).json(newOrder)
    } catch (error) {
        next(error)
    }
})

module.exports = router

```

Y lo agregamos también a las rutas generales del index:

***api\db\models\index.js***

```javascript

(...)
const orderRouter = require('./orders.router')
(...)
router.use('/orders', orderRouter)
(...)

```

Ahora ya podemos hacer llamadas al endpoint para agregar orders:

```JSON
{
    "customerId": 1 //Debe existir el customerId
}
```

Y nos devuelve:

```JSON
{
    "createdAt": "2024-08-17T10:13:13.510Z",
    "id": 1,
    "customerId": 1
}
```

Y a su vez tenemos el endpoint /api/v1/orders/id que nos devuelve la información anidada del order:

```JSON
{
    "id": 1,
    "customerId": 1,
    "createdAt": "2024-08-17T10:13:13.510Z",
    "customer": {
        "id": 1,
        "name": "José3",
        "lastName": "Molina",
        "phone": "685487541",
        "createdAt": "2024-08-17T10:13:06.194Z",
        "userId": 1,
        "user": {
            "id": 1,
            "email": "jose@email.com",
            "password": "1234",
            "role": "customer",
            "createdAt": "2024-08-17T10:13:06.194Z"
        }
    }
}
```

## Clase 21 Relaciones muchos a muchos

Ahora vamos a hacer relaciones muchos a muchos. Esto se gestiona con una tabla ternaria entre los 2 modelos:

***api\db\models\order-product.model.js***

```javascript

const { Model, DataTypes, Sequelize } = require('sequelize')

const { ORDER_TABLE } = require('./order.model')
const { PRODUCT_TABLE } = require('./product.model')

const ORDER_PRODUCT_TABLE = 'orders_products'

const OrderProductSchema = {
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: DataTypes.INTEGER },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW
    },
    amount: {
        allowNull: false,
        type: DataTypes.INTEGER
    },
    orderId: {
        field: 'order_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: { model: ORDER_TABLE, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    productId: {
        field: 'product_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: { model: PRODUCT_TABLE, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    }
}
class OrderProduct extends Model {
    static associate(models) {}
    static config(sequelize) {
        return {
            sequelize,
            tableName: ORDER_PRODUCT_TABLE,
            modelName: 'OrderProduct',
            timestamps: false
        }
    }
}
module.exports = { OrderProduct, OrderProductSchema, ORDER_PRODUCT_TABLE }

```

Generamos la migración con 'npm run migrations:generate order-product' y la ejecutamos después 'npm run migrations:run':

***api\db\migrations\20240817105622-order-product.js***

```javascript

'use strict'

const { OrderProductSchema, ORDER_PRODUCT_TABLE } = require('./../models/order-product.model')

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable(ORDER_PRODUCT_TABLE, OrderProductSchema)
    },

    async down(queryInterface) {
        await queryInterface.dropTable(ORDER_PRODUCT_TABLE)
    }
}

```

Por último vamos a crear la asociación e iniciar el modelo nuevo:

***api\db\models\order.model.js***

```javascript

(...)
        this.belongsToMany(models.Product, {
            as: 'items',
            through: models.OrderProduct,
            foreignKey: 'orderId',
            otherKey: 'productId'
        })
(...)

```

***api\db\models\index.js***

```javascript

(...)

const { OrderProduct, OrderProductSchema } = require('./order-product.model')

(...)

OrderProduct.init(OrderProductSchema, OrderProduct.config(sequelize))

```

## Clase 22 Resolviendo relaciones muchos a muchos

Vamos a agregar la ruta para poder llamar al endpoint que agregue un item dentro de las rutas de order:

***api\routes\orders.router.js***

```javascript

(...)

    const { getOrderSchema, createOrderSchema, addItemSchema } = require('../schemas/order.schema')

(...)


    router.post('/add-item', validatorHandler(addItemSchema, 'body'), async (req, res, next) => {
        try {
            const body = req.body
            const newItem = await service.addItem(body)
            res.status(201).json(newItem)
        } catch (error) {
            next(error)
        }
    })

(...)

```

También modificamos el schema y el service de order:

***api\schemas\order.schema.js***

```javascript

const Joi = require('joi')

const id = Joi.number().integer()
const customerId = Joi.number().integer()
const orderId = Joi.number().integer()
const productId = Joi.number().integer()
const amount = Joi.number().integer().min(1)

const getOrderSchema = Joi.object({ id: id.required() })

const createOrderSchema = Joi.object({ customerId: customerId.required() })

const addItemSchema = Joi.object({
    orderId: orderId.required(),
    productId: productId.required(),
    amount: amount.required()
})

module.exports = { getOrderSchema, createOrderSchema, addItemSchema }

```

***api\services\order.service.js***

```javascript

(...)

    async addItem(data) {
        const newItem = await models.OrderProduct.create(data)
        return newItem
    }

(...)

    async findOne(id) {
        const order = await models.Order.findByPk(id, {
            include: [
                {
                    association: 'customer',
                    include: ['user']
                },
                'items'
            ]
        })
        return order
    }

(...)

```

Por último vamos a hacer un calculo que haga cálculo con alguno de los campos que devuelve la consulta. Por ejemplo, el total del precio de la orden de compra de todos los productos.

***api\db\models\order.model.js***

```javascript

(...)

    },
    total: {
        type: DataTypes.VIRTUAL, // Esto indica a sequelize que no es un campo de base de datos
        get() {
            if (this.items.length > 0) {
                return this.items.reduce((total, item) => {
                    return total + item.price * item.OrderProduct.amount // Esto solo se debe usar para cálculos pequeños. Para cálculos grandes se debe dejar que node lo realice en una consulta
                }, 0)
            }
            return 0
        }
    }

(...)

```

Y ya con esto podemos hacer consultas con postman para agregar y consultar orders:

Datos de envío:

***/api/v1/orders/add-item***

```JSON
{
    "orderId": 4,
    "productId": 3,
    "amount": 5
}

```

***/api/v1/orders/id***

No necesarios, solo indicar el id existente

Respuestas:

***/api/v1/orders/add-item***

```JSON
{
    "createdAt": "2024-08-17T16:43:55.164Z",
    "id": 10,
    "orderId": 4,
    "productId": 3,
    "amount": 5
}

```

***/api/v1/orders/id***

```JSON
{
    "total": 8463,
    "id": 1,
    "customerId": 1,
    "createdAt": "2024-08-17T10:13:13.510Z",
    "customer": {
        "id": 1,
        "name": "José3",
        "lastName": "Molina",
        "phone": "685487541",
        "createdAt": "2024-08-17T10:13:06.194Z",
        "userId": 1,
        "user": {
            "id": 1,
            "email": "jose@email.com",
            "password": "1234",
            "role": "customer",
            "createdAt": "2024-08-17T10:13:06.194Z"
        }
    },
    "items": [
        {
            "id": 3,
            "name": "23a3434sa34ws3d",
            "image": "http://placeimg.com/640/480",
            "description": "asda sdfsdf sdf sdf sdf a",
            "price": 1209,
            "createdAt": "2024-08-17T16:19:50.286Z",
            "categoryId": 5,
            "OrderProduct": {
                "id": 5,
                "createdAt": "2024-08-17T16:36:06.178Z",
                "amount": 2,
                "orderId": 1,
                "productId": 3
            }
        },
        {
            "id": 6,
            "name": "23a3434s34ws3pd",
            "image": "http://placeimg.com/640/480",
            "description": "asda sdfsdf sdf sdf sdf a",
            "price": 1209,
            "createdAt": "2024-08-17T16:21:07.794Z",
            "categoryId": 1,
            "OrderProduct": {
                "id": 4,
                "createdAt": "2024-08-17T16:35:35.223Z",
                "amount": 5,
                "orderId": 1,
                "productId": 6
            }
        }
    ]
}

```

## Clase 23 Paginación

Vamos a agregar paginación al endpoint get de productos. Para ello primero creamos el endpoint en el router:

***api\routes\products.router.js***

```javascript

(...)

    const { createProductSchema, updateProductSchema, getProductSchema, queryProductSchema} = require('./../schemas/product.schema')

(...)

    router.get('/', validatorHandler(queryProductSchema, 'query'), async (req, res, next) => {
        try {
            const products = await service.find(req.query)

            res.json(products)
        } catch (error) {
            next(error)
        }
    })

(...)

```

Modificamos el schema y el service con el limit (numero de elementos a devolver) y offset (posición de empiece del array para dovolver elementos en adelante) necesario para la paginación:

***api\schemas\product.schema.js***

```javascript

(...)

    const limit = Joi.number().integer()
    const offset = Joi.number().integer()

(...)

    const queryProductSchema = Joi.object({
        limit,
        offset
    })

    module.exports = { createProductSchema, updateProductSchema, getProductSchema, queryProductSchema }

(...)

```

***api\services\products.services.js***

```javascript

(...)

    async find(query) {
        const options = {
            include: ['category']
        }
        const { limit, offset } = query
        if (limit && offset) {
            options.limit = limit
            options.offset = offset
        }
        const products = await models.Product.findAll(options)
        return products
    }

(...)

```

Con esto ya podemos hacer una consulta al endpoint de productos con limit y offset (no son obligatorios, en caso de no enviarlos devuelve todos):

Datos de envío van en la query de la url:

***/api/v1/products?limit=3&offset=12***

```JSON
[
    {
        "id": 18,
        "name": "product 10",
        "image": "http://placeimg.com/640/480",
        "description": "asdad asdasdasdadasda",
        "price": 1209,
        "createdAt": "2024-08-17T17:16:56.814Z",
        "categoryId": 3,
        "category": {
            "id": 3,
            "name": "Category 2",
            "image": "http://placeimg.com/640/480",
            "createdAt": "2024-08-17T16:19:25.815Z"
        }
    },
    {
        "id": 19,
        "name": "product 11",
        "image": "http://placeimg.com/640/480",
        "description": "asdad asdasdasdadasda",
        "price": 1209,
        "createdAt": "2024-08-17T17:16:59.476Z",
        "categoryId": 3,
        "category": {
            "id": 3,
            "name": "Category 2",
            "image": "http://placeimg.com/640/480",
            "createdAt": "2024-08-17T16:19:25.815Z"
        }
    },
    {
        "id": 20,
        "name": "product 12",
        "image": "http://placeimg.com/640/480",
        "description": "asdad asdasdasdadasda",
        "price": 1209,
        "createdAt": "2024-08-17T17:17:02.610Z",
        "categoryId": 3,
        "category": {
            "id": 3,
            "name": "Category 2",
            "image": "http://placeimg.com/640/480",
            "createdAt": "2024-08-17T16:19:25.815Z"
        }
    }
]

```

## Clase 24 Filtrando precios con operadores

Vamos a hacer una consulta con filtros. Por ejemplo, por precio, tanto un valor concreto como con máximos y mínimos. Para ello cambiamos tanto el schema como el service:

***api\schemas\product.schema.js***

```javascript

(...)

    const price_min = Joi.number().integer().min(10)
    const price_max = Joi.number().integer().min(10)

(...)

    const queryProductSchema = Joi.object({
    limit,
    offset,
    price,
    price_min,
    price_max: price_max.when('price_min', { // Con esto validamos que si nos mandan un mínimo el price_max se vuelve obligatorio.
        is: Joi.number().integer().required(),
        then: Joi.required()
    })
})

```

***api\services\products.services.js***

```javascript

(...)

    const { Op } = require('sequelize')

(...)

    const options = {
        include: ['category'],
        where: {}
    }

(...)

    async find(query) {
        const options = {
            include: ['category'],
            where: {}
        }
        const { limit, offset } = query
        if (limit && offset) {
            options.limit = limit
            options.offset = offset
        }
        const { price } = query
        if (price) {
            options.where.price = price
        }

        const { price_min, price_max } = query
        if (price_min && price_max) {
            options.where.price = {
                [Op.gte]: price_min,
                [Op.lte]: price_max
            }
        }

        const products = await models.Product.findAll(options)
        return products
    }

(...)

```

Ahora ya podemos hacer consultas al endpoint con las querys de precio máximo y mínimo. También en combinación con las anteriores querys-params (limit, offset):

***/api/v1/products?limit=3&offset=0&price_min=10&price_max=70***

```JSON
[
    {
        "id": 3,
        "name": "23a3434sa34ws3d",
        "image": "http://placeimg.com/640/480",
        "description": "asda sdfsdf sdf sdf sdf a",
        "price": 10,
        "createdAt": "2024-08-17T16:19:50.286Z",
        "categoryId": 5,
        "category": {
            "id": 5,
            "name": "Category 4",
            "image": "http://placeimg.com/640/480",
            "createdAt": "2024-08-17T16:19:31.479Z"
        }
    },
    {
        "id": 6,
        "name": "23a3434s34ws3pd",
        "image": "http://placeimg.com/640/480",
        "description": "asda sdfsdf sdf sdf sdf a",
        "price": 20,
        "createdAt": "2024-08-17T16:21:07.794Z",
        "categoryId": 1,
        "category": {
            "id": 1,
            "name": "Category 5",
            "image": "http://placeimg.com/640/480",
            "createdAt": "2024-08-17T16:19:19.189Z"
        }
    },
    {
        "id": 7,
        "name": "232",
        "image": "http://placeimg.com/640/480",
        "description": "asdad asdasdasdadasda",
        "price": 30,
        "createdAt": "2024-08-17T17:16:09.295Z",
        "categoryId": 3,
        "category": {
            "id": 3,
            "name": "Category 2",
            "image": "http://placeimg.com/640/480",
            "createdAt": "2024-08-17T16:19:25.815Z"
        }
    }
]

```

## Extra Fix de migraciones

Las migraciones tienen un error al desplegar de primeras todas de seguido. Este error es que se están usando los schemas de los modelos .js que hemos ido cambiando pero eso no conserva el historial por lo que dan incompatibilidades. Por ejemplo, en la primera migración se crea el usuario y se utiliza el esquema del modelo (este modelo con el tiempo lo hemos ido cambiando y va actualizando el schema) por ello cuando llega la segunda migración y quiera agregar el campo role, este ya está en el schema y falla. Para solucionar todo esto no se debe usar los schemas de los modelos en las migraciones sino agregar directamente el json, aunque se duplique código. Es la forma de conservar el historial de cambios.

Se modifican todas las migraciones en el código de esta manera.
