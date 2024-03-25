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
