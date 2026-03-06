import type { User } from '../models/User';

export class UserService {
    getLoggedUser(): User {
        return {
            id: 'mock-user-123',
            imie: 'Jan',
            nazwisko: 'Kowalski'
        };
    }

}