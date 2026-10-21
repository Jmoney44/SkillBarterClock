export type SessionStatus = "Confirmed" | "Awaiting confirmation" | "Completed";

export type Person = {
  id: string;
  name: string;
  skill: string;
  rating: string;
  hours: string;
  swap: string;
  category: string;
  image: string;
};

export type Session = {
  id: number;
  name: string;
  skill: string;
  date: string;
  time: string;
  duration: number;
  status: SessionStatus;
  image: string;
};

export const people: Person[] = [
  { id: "amaka-okafor", name: "Amaka Okafor", skill: "Yoruba · Intermediate", rating: "4.98", hours: "42 hours taught", swap: "Excel, public speaking", category: "Languages", image: "photo-1534528741775-53994a69daeb" },
  { id: "tunde-adebayo", name: "Tunde Adebayo", skill: "Excel · Advanced", rating: "4.95", hours: "86 hours taught", swap: "Yoruba, guitar", category: "Tech & office", image: "photo-1500648767791-00dcc994a43e" },
  { id: "chinwe-nwosu", name: "Chinwe Nwosu", skill: "Brand design · Advanced", rating: "5.0", hours: "31 hours taught", swap: "French, baking", category: "Creative", image: "photo-1531123897727-8f129e1688ce" },
];

export const initialSessions: Session[] = [
  { id: 1, name: "Amaka Okafor", skill: "Yoruba conversation", date: "Today, Oct 20", time: "4:30 PM", duration: 1.5, status: "Confirmed", image: people[0].image },
  { id: 2, name: "David Chen", skill: "Portfolio review", date: "Wed, Oct 22", time: "11:00 AM", duration: 1, status: "Confirmed", image: "photo-1506794778202-cad84cf45f1d" },
  { id: 3, name: "Fatima Bello", skill: "Excel for beginners", date: "Oct 18", time: "2:00 PM", duration: 1, status: "Awaiting confirmation", image: "photo-1544005313-94ddf0286df2" },
];

export const ledger = [
  { title: "Starter credits", detail: "Profile completion bonus", date: "Oct 16, 2026", amount: "+2.0", kind: "plus" },
  { title: "Taught Canva basics", detail: "with Nneka Eze", date: "Oct 17, 2026", amount: "+1.5", kind: "plus" },
  { title: "Yoruba conversation", detail: "Held for Amaka Okafor", date: "Oct 20, 2026", amount: "−1.5", kind: "hold" },
  { title: "Taught Excel formulas", detail: "with Musa Ibrahim", date: "Oct 14, 2026", amount: "+2.0", kind: "plus" },
] as const;
