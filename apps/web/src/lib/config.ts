export const config = {
  apiBaseUrl:
    process.env.BASIX_API_URL ??
    process.env.NEXT_PUBLIC_BASIX_API_URL ??
    "http://localhost:3000/api",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
};
