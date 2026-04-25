import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/db/schema"

//prepare:false keeps this safe behind the transaction pooler (port 6543);
//it is also harmless on the session pooler or a direct connection
const client = postgres(process.env.DATABASE_URL!, { prepare: false })

export const db = drizzle({ client, schema, casing: "snake_case" })
