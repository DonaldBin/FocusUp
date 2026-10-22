/** Example focuses for Create page chips (PRD §6.2 / Task 4.2). */

export const EXAMPLE_FOCUSES = [
  { name: "Fitness", why: "Build a healthier body" },
  { name: "Skill", why: "Get better at a craft I care about" },
  { name: "Learning", why: "Grow knowledge that compounds" },
  { name: "Making money", why: "Increase income with focused effort" },
] as const;

export const FOCUS_LIMIT_REACHED_MESSAGE =
  "Focus limit reached. Paused focuses still count toward your limit.";
