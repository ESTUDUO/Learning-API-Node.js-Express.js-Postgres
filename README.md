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

Antes de nada se va a crear un handler para tratar los errores que vienen del sequelize.

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
    errorHandler,
    boomErrorHandler,
    ormErrorHandler
} = require('./middlewares/error.handler')

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
