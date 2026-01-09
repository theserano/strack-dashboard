export const env = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
};

if (!env.API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is missing');
}
