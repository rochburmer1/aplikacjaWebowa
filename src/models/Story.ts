export type Priority = 'niski' | 'średni' | 'wysoki';
export type Status = 'todo' | 'doing' | 'done';

export interface Story {
    id: string;
    nazwa: string;
    opis: string;
    priorytet: Priority;
    projektId: string;
    dataUtworzenia: string; // Przechowujemy jako ISO string (np. "2023-10-25T10:00:00.000Z")
    stan: Status;
    wlascicielId: string;
}