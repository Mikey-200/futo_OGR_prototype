# FUTO OGR: Result Approval Workflow Guide

This guide explains how the Official Grade Result (OGR) Portal processes student grades from the moment they are marked to when the student sees them. It is designed to be simple and easy to understand.

---

## 🏗️ 1. How it works on the Database Side (Supabase)

To keep the system fast and safe, we separate the **scores** from the **approval tracking**:

1. **`public.results` (The Scores):** This massive table holds every single grade (CA, Exam, Total). It has a lock on it called `is_released` (True or False). **Students can NEVER see a score unless `is_released` is True.**
2. **`public.course_submissions` (The Tracker):** This is a small, lightweight table that tracks *where* a course's document currently is. Think of it like a FedEx package tracker. It stores a `status` like `DRAFT`, `AWAITING_HOD`, or `AWAITING_DEAN`.

---

## 🔄 2. The Step-by-Step Approval Flow

Here is the exact journey of a result from start to finish:

### Step 1: The Lecturer (Course Coordinator)
* **Status in Database:** `DRAFT`
* **What happens:** The Lecturer logs in, uploads the CSV file of grades, and checks for any errors. At this stage, they are the only ones who can edit the numbers. 
* **Action:** Once satisfied, they click **"Sign & Submit to HOD"**. The status changes to `AWAITING_HOD`.

### Step 2: The HOD & Secretary
* **Status in Database:** `AWAITING_HOD`
* **What happens:** The HOD logs in. The document is now *locked* so the Lecturer can't change grades while the HOD is reviewing.
* **Action:** 
  - If there is an error: HOD clicks **"Request Adjustments"** (Sends it back to the Lecturer as a `DRAFT`).
  - If perfect: HOD clicks **"Sign & Forward to Dean"**. The status changes to `AWAITING_DEAN`.

### Step 3: The Dean
* **Status in Database:** `AWAITING_DEAN`
* **What happens:** The Dean logs in to vet the department's results. 
* **Action:**
  - If there is an error: Dean clicks **"Return to HOD"** (Sends it back to the HOD for correction).
  - If perfect: Dean clicks **"Sign & Approve Result"**. The status changes to `APPROVED_BY_DEAN`.

### Step 4: The Final Release (Department / Course Advisor)
* **Status in Database:** `APPROVED_BY_DEAN`
* **What happens:** The approved document bounces back to the HOD's dashboard. It now has the Dean's official signature of approval.
* **Action:** The HOD clicks the final **"Release to Students"** button. 

---

## 🔒 3. What happens when "Release to Students" is clicked?
This is the most critical step. 
When the HOD clicks "Release to Students":
1. The tracker status changes to `RELEASED`.
2. The database instantly goes into the `public.results` table and flips `is_released` to **True** for all students in that specific course.
3. **The Lock is broken:** Students can now log into their Academic Profile and instantly see their final CGPA and grades!

---

## 📝 Quick Rule of Thumb for Editing
- **Lecturers** can ONLY upload or edit CSV files when the status is `DRAFT`.
- **HODs** can ONLY edit if they send it back to themselves or while reviewing in `AWAITING_HOD`.
- **Deans** have "Read-Only" viewing rights to ensure data is not accidentally altered at the top level.
