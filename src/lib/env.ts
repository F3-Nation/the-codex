import * as dotenv from 'dotenv';

export function loadEnvConfig() {
    const env = process.env.NODE_ENV || 'local';
    dotenv.config({ path: `.env.${env}` });

    if (!process.env.DATABASE_URL) {
        throw new Error(`DATABASE_URL is not set in .env.${env}`);
    }

    return {
        DATABASE_URL: process.env.DATABASE_URL,
        NODE_ENV: env,
    };
}
