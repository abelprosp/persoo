import pg from "pg";
const db=new pg.Client({connectionString:process.env.DATABASE_URL_ADMIN});await db.connect();
try {await db.query("BEGIN");for(const table of ["auth.sessions","auth.password_resets","public.app_rate_limits","public.ai_previews"])await db.query("DELETE FROM "+table+" WHERE expires_at<now()");await db.query("COMMIT");console.log("Registros temporários expirados removidos.");}finally{await db.end();}
