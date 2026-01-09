import { email } from 'zod/src/v4/core/regexes';

export interface signUpRequest {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    accountType: 'individual' | 'business';
    businessName?: string;
    businessEmail?: string;
}

export interface loginRequest {
    email: string;
    password: string;
    accountType: 'individual' | 'business';
}