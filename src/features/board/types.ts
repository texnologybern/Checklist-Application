export type CardTone = 'info' | 'success' | 'warning' | 'danger';

export interface BoardCard {
  id: string;
  title: string;
  body: string;
  tone: CardTone;
}
