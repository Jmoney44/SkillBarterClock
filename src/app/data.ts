export type PublicTeacher = {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio: string;
  location: string;
  languages: string[];
  timezone: string;
  availability: string;
  teaching_skills: string[];
  learning_skills: string[];
  /** Average of learner reviews, or null when there are none yet. */
  rating_average: number | string | null;
  rating_count: number;
};
