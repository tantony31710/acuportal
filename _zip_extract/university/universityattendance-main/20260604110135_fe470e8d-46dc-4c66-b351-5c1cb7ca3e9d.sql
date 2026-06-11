
CREATE TABLE public.roster_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_number text NOT NULL UNIQUE,
  full_name text NOT NULL,
  academic_group text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roster_entries TO authenticated;
GRANT ALL ON public.roster_entries TO service_role;
ALTER TABLE public.roster_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers read roster" ON public.roster_entries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers insert roster" ON public.roster_entries
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers update roster" ON public.roster_entries
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers delete roster" ON public.roster_entries
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
