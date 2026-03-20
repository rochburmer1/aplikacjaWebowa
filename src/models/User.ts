export type Role = 'admin' | 'devops' | 'developer';

export interface User {
    id: string;
    imie: string;
    nazwisko: string;
    rola: Role;
}