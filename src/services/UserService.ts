import type { User } from '../models/User';

export class UserService {
    // Na ten moment zwracamy mocka (zaślepkę) użytkownika
    getLoggedUser(): User {
        return {
            id: 'mock-user-123',
            imie: 'Jan',
            nazwisko: 'Kowalski'
        };
    }

    // W przyszłości tutaj dodasz metody np.:
    // login(email, password)
    // logout()
    // register(userData)
}