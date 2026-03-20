import type { User } from '../models/User';

export class UserService {
    private mockUsers: User[] =[
        {id: 'admin-1', imie: 'Jan', nazwisko: 'Kowalski', rola: 'admin'},
        {id: 'dev-1', imie: 'Pawel', nazwisko: 'Rozbojnik', rola: 'developer'},
        {id: 'admin-1', imie: 'Piotr', nazwisko: 'Klapaz', rola: 'devops'},
    ];

    getLoggedUser(): User{
        return this.mockUsers.find(u => u.rola === 'admin') as User;
    }

    getAllUsers(): User[] {
        return this.mockUsers;
    }

}