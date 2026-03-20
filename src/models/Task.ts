import type { Priority,Status } from "./Story";

export interface Task{
    id: string;
    nazwa: string;
    opis: string;
    priorytet: Priority;
    historyjkaId: string;
    przewidywanyCzas: number;
    przepracowaneGodziny?: number;
    stan: Status;
    dataDodania: string;
    dataStartu?: string;
    dataZakonczenia?: string;
    przypisanyUzytkownikId?: string;
}