# ARCHITECTURE.md: Smart Web-Based Waste Management System (SWB-WMS)
## 1. Project Context
* **Application Name:** Smart Web-Based Waste Management System (SWB-WMS)
* **Primary Objective:** To digitize and streamline waste management operations by enabling real-time reporting, automated task assignment, and route tracking.

---

## 2. Product Requirements Document (PRD)
### 2.1 Target Audience
* **Residents:** Need a frictionless way to report overflowing bins or illegal dumping.
* **Collectors (Drivers):** Need clear, localized daily routes and task tracking on mobile.
* **Admins (Dispatchers):** Need a bird's-eye view of campus/community waste health and personnel tracking.

### 2.2 Core Features (MVP)
1. **Auth System:** Role-based access control (Resident, Collector, Admin).
2. **Reporting Engine:** Form with geolocation capture and image upload capabilities.
3. **Real-Time Dashboard:** Map-based UI showing pin drops for reported waste.
4. **Task Management:** Admins assign reports to specific collectors; collectors update task statuses in real-time.

---

## 3. Technical Requirements Document (TRD)
### 3.1 Technology Stack
* **Frontend Framework:** React.js (via Vite) for fast, client-side rendering.
* **Styling:** Tailwind CSS for a utility-first, mobile-responsive design system.
* **Backend / Database:** Supabase (PostgreSQL).
* **Authentication:** Supabase Auth (Email/Password).
* **Storage:** Supabase Storage (for waste report images).
* **Mapping:** Leaflet.js with React-Leaflet wrapper for geospatial visualization.
* **Hosting:** Vercel or Netlify.

### 3.2 Performance & Security Constraints
* **Row Level Security (RLS):** Supabase policies must ensure residents only view their own reports, collectors view assigned tasks, and admins view all data.
* **Real-time Latency:** Supabase Realtime listeners must update the Admin map UI immediately upon a new report submission or task completion.

---

## 4. UI/UX Design System
### 4.1 Color Palette
* **Primary:** Forest Green (`#16a34a`) – Primary buttons, success states, completed tasks.
* **Secondary:** Slate Gray (`#64748b`) – Typography, borders, secondary text.
* **Alert/Critical:** Rose Red (`#e11d48`) – Critical/overflowing bin markers, destructive actions.
* **Background:** Off-White/Gray (`#f8fafc`) – Dashboard canvas.

### 4.2 Typography & Layout
* **Font:** Inter or Roboto (clean sans-serif).
* **Layout Strategy:** Mobile-first. Collector and Resident views must be fully operational on mobile screens. The Admin view utilizes a desktop-optimized grid with a persistent sidebar and a large central map container.

---

## 5. Appflow (User Journeys)
### 5.1 Resident Flow
1. Authenticates (Login/Signup).
2. Redirects to Resident Dashboard.
3. Clicks "Report Waste" -> UI requests browser Geolocation -> User uploads photo & description.
4. Submits form -> Receives confirmation -> Views history of past reports (Pending/Resolved).

### 5.2 Collector Flow
1. Authenticates -> Redirects to Collector Dashboard (Mobile view).
2. Views "Assigned Tasks" list.
3. Clicks a task -> Opens details (Map coordinates, waste image).
4. Clears waste on-site -> Clicks "Mark as Completed."
5. Task drops from active list.

### 5.3 Admin Flow
1. Authenticates -> Redirects to Admin Command Center.
2. Views Leaflet map with red pins (pending) and green pins (cleared).
3. Clicks a pending pin -> Opens report details modal.
4. Selects a Collector from dropdown -> Assigns Task.
5. Map and task lists update in real-time via Supabase listeners.

---

## 6. Backend Schema (Supabase PostgreSQL)
The following tables form the core database architecture. Ensure Row Level Security (RLS) is enabled for all tables after creation.

```sql
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
```
