
export interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    accountType: "individual" | "business";
    businessName?: string;
    businessEmail?: string;
}