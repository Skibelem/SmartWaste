-- 1. Profiles (Linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('resident', 'collector', 'admin')) DEFAULT 'resident',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Waste Reports
CREATE TABLE waste_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id),
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  image_url TEXT,
  status TEXT CHECK (status IN ('pending', 'assigned', 'resolved')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Collection Tasks
CREATE TABLE collection_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES waste_reports(id),
  collector_id UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('assigned', 'in-progress', 'completed')) DEFAULT 'assigned',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_tasks ENABLE ROW LEVEL SECURITY;

-- 4. Enable automatic profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Anonymous User'),
    COALESCE(new.raw_user_meta_data->>'role', 'resident')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when auth.users is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Standard RLS policies

-- Profiles RLS
CREATE POLICY "Allow public read access to profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Waste Reports RLS
CREATE POLICY "Allow residents to insert their own reports" ON waste_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Allow users to select appropriate reports" ON waste_reports
  FOR SELECT USING (
    auth.uid() = reporter_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('collector', 'admin')
    )
  );

CREATE POLICY "Allow admins to update reports" ON waste_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Collection Tasks RLS
CREATE POLICY "Allow users to view their assigned tasks or if admin" ON collection_tasks
  FOR SELECT USING (
    collector_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow collectors to update their assigned tasks" ON collection_tasks
  FOR UPDATE USING (
    collector_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins full control of collection tasks" ON collection_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
