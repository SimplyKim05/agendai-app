export interface AgendaItem {
  title: string;
  summary: string;
  actionItems: string[];
  stakeholders: string[];
  durationMinutes: number;
}

export interface Agenda {
  title: string;
  totalDuration: number;
  items: AgendaItem[];
  objective: string;
}
