import axios from 'axios';

/** True when the server is unreachable, asleep or timing out (no response, or a gateway error). */
export const isServerDown = (error: unknown): boolean =>
  axios.isAxiosError(error) && (!error.response || error.response.status >= 502);
