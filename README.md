# Curso Curso de Backend con Node.js: Base de Datos con PostgreSQL

## Clase 4 Configuración de Postgres en Docker

Se crea docker-compose-yml usado para crear el contenedor de postgres

```
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

Para levantar el servicio concreta de postgres (nombre que le hemos dado al servicio) se usa el comando "docker-compose up -d postgress"

Otros comandos útiles de docker:

-   docker-compose ps --> Nos muestra los servicios actualmente levantados
-   docker-compose down --> Para los servicios actualmente levantados. Se puede añadir nombre del servicio si queremos solo parar uno en concreto

## Clase 5 Explorando Postgres: interfaces gráficas vs. terminal

docker-compose exec postgres bash

_// De esta manera nos conectamos a la terminal del servicio llamado postgres. Desde aquí se puede configurar la bbdd. Pero se va a hacer desde interfaz gráfica_

Añadimos un servicio de pgadmin (interfaz gráfica para postgres) al docker-compose

```
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

```
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

```
const getConnection = require('../libs/postgres')
```

Desde este momento podemos hacer conexiones usando este objeto. Por ejemplo lo usamos en el servicio de usuarios, en el método find:

```
async find() {
    const client = await getConnection()
    const rta = await client.query('SELECT * FROM tasks')
    return rta.rows
}
```

El objeto client devuelto por getConnection tiene un método 'query' al que le pasamos las querys de consulta a base de datos.
