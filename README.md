# Setup

1. create a new supabase project
2. go to Database > Extensions > and search for and enable "vector" [(more info here)](https://supabase.com/docs/guides/database/extensions/pgvector)
3. Within your Wasp config file, make sure your Prisma entity has the `Unsupported("vector (1536)")` property type
4. Run `wasp db migrate-dev` to generate the migration file
5. Run `wasp start` 
6. After the app starts, you should be able to go to Database > Tables in your supabase dashboard and see the new table created based on your Prisma entity definition in your Wasp config file


```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
  extensions = [pgvector(map: "vector", schema: "extensions")]
}

generator client {
  provider = "prisma-client-js"
  output = env("PRISMA_CLIENT_OUTPUT_DIR")
  previewFeatures = ["postgresqlExtensions"]
}
```