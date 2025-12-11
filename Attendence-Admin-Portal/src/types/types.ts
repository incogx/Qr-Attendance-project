// src/components/faculty/types.ts
export type ClassItem = {
  id: string;
  name: string;
  start?: string;
  end?: string;
  location?: string;
  date?: string;
};

export type Student = {
  id: string;
  name: string;
  roll?: string;
};
