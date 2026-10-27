/**
 * Selected school (학교) for the UI mock. In-memory only — resets on reload.
 * `null` until the user picks one on the first screen; login redirects back there.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { SCHOOLS, type School } from '@/constants/coffeul';

type SchoolValue = {
  school: School | null;
  setSchool: (s: School) => void;
};

const SchoolContext = createContext<SchoolValue | null>(null);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [school, setSchool] = useState<School | null>(null);
  const value = useMemo(() => ({ school, setSchool }), [school]);
  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be used inside <SchoolProvider>');
  return ctx;
}

/**
 * 학교 목록 조회. 지금은 상수를 돌려주지만, 백엔드가 생기면 여기서만
 * fetch 로 바꾸면 된다 (화면은 { schools, loading } 형태에 이미 맞춰져 있음).
 */
export function useSchools() {
  return { schools: SCHOOLS, loading: false };
}
