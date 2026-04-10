import { defineConfig } from "@prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: "mysql://vertex_user:4Y%25%263c%2379%25%5E4J9@127.0.0.1:3306/vertex"
    }
})
