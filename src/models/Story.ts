export type Priority = 'niski' | 'średni' | 'wysoki';
export type Status = 'todo' | 'doing' | 'done';

export interface Story {
    id: string;
    nazwa: string;
    opis: string;
    priorytet: Priority;
    projektId: string;
    dataUtworzenia: string;  
    stan: Status;
    wlascicielId: string;
}