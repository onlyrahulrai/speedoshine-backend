## NPM/Yarn Scripts Explained

| Script                 | Description                                                           |
|------------------------|---------------------------------------------------------------------- |
| `yarn dev`             | Start the development server with auto reload using tsx               |
| `yarn start`           | Start the production server                                           |
| `yarn tsoa:routes`     | Generate tsoa route bindings from controllers                         |
| `yarn tsoa:spec`       | Generate Swagger (OpenAPI) JSON documentation                         |
| `yarn tsoa:build`      | Generate both route bindings and Swagger spec                         |

## Deploy Script

`
pm2 start src/server.ts --name digitaldetoxification --interpreter tsx

`
