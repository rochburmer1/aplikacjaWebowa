export type Role = 'admin' | 'devops' | 'developer' | 'gosc';

export interface User {
    id: string;
    email: string;
    imie: string;
    nazwisko: string;
    rola: Role;
    isBlocked?: boolean;
}