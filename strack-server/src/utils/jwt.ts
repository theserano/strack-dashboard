import jwt, { SignOptions } from "jsonwebtoken";

const ACCESS_TOKEN_SECRET: jwt.Secret = process.env.ACCESS_TOKEN_SECRET || "supersecret";
const REFRESH_TOKEN_SECRET: jwt.Secret = process.env.REFRESH_TOKEN_SECRET || "refreshSupersecret";

export const signAccessToken = (payload: object, expiresIn = 3600) => {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, options);
};

export const signRefreshToken = (payload: object, expiresIn = 604800) => {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, options);
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};
