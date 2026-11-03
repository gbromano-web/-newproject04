export const SITE_PORT = Number(process.env.AUTH_TEST_SITE_PORT || 3210);
export const AUTH_PORT = Number(process.env.AUTH_TEST_AUTH_PORT || 54329);
export const DB_PORT = Number(process.env.AUTH_TEST_DB_PORT || 54330);
export const BASE_URL = `http://localhost:${SITE_PORT}`;
