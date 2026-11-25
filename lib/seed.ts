import type { DB } from "./types";

export function emptyDB(): DB {
  return {
    school: { name: "", city: "", stage: "", year: "", principal: "", isDemo: false },
    users: [], domains: [], standards: [], indicators: [], evidence: [], tasks: [], plans: [],
  };
}
