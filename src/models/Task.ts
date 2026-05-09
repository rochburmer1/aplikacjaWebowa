export type TaskPriority = 'niski' | 'średni' | 'wysoki';
export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
    id: string;
    nazwa: string;
    opis: string;
    priorytet: TaskPriority;
    historyjkaId: string; // Przypisanie do historyjki
    przewidywanyCzas: number;
    stan: TaskStatus;
    dataDodania: string; // ISOString
    dataStartu?: string; // Pojawia się, gdy przejdzie w 'doing'
    dataZakonczenia?: string; // Pojawia się, gdy przejdzie w 'done'
    przypisanyUzytkownikId?: string; // Dev lub DevOps
    przepracowaneGodziny: number; // Z naszego poprzedniego kodu
}
