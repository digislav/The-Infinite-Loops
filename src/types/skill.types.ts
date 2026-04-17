export type Proficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface Skill {
  id?: string;
  skill_name: string;
  category?: string;
  proficiency?: Proficiency;
  order_index?: number;
}
