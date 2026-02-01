# Summary of the interaction
## Basic information
    Domain: EDTECH
    Problem statement: ACADEMIC PROGRESS TRACKING AND OUTCOME PROGRESS
    Date of interaction: 01-02-2026
    Mode of interaction: video call
    Duration (in-minutes): 60 Minutes
    Publicly accessible Video link: https://drive.google.com/file/d/1YsFSNmpGSD2_qtTUb8JDGvkmbB2v28qW/view
## Domain Expert Details
    Role/ designation (Do not include personal or sensitive information): Assistant Professor
    Experience in the domain (Brief description of responsibilities and years of experience in domain): 25 years of experience
    Nature of work: Lecturare
## Domain Context and Terminology
- How would you describe the overall purpose of this problem statement in your daily work?
    The overall purpose is to act as a centralized Safety Net that transforms academic management from a reactive process into a proactive one. In daily operations, it serves as a digital hub that ensures no student "falls through the cracks" by providing real-time visibility into their progress, from attendance to final graduation projects.
- What are the primary goals or outcomes of this problem statement?
    The primary outcomes include the Early Detection of Risk through Rule-Driven alerts, the Simplification of Administrative Tasks (like grading, attendance, and reporting), and the Streamlining of Project Mentorship through a structured digital workflow for honors and final year milestones.
- List key terms used by the domain expert and their meanings (Copy these to definition.yml)

| Term | Meaning as explained by the expert |
|-------------------------|-------------------------------------------------------------------------------------------------------------------|
|          RBAC           | Role-Based Access Control; a model that defines what Students, Faculty, and Admins can see and do.                | 
| BTP / Honors Milestones | Specific stages of a final year or research project that follow a strict "Upload → Review → Approval" logic.      |
|      Pub/Sub Model      | An asynchronous messaging pattern used by the Notification Service to handle high-volume event triggers.          |
|  State-Machine Pattern  | A logic flow used for project uploads where a file must pass through specific statuses (e.g., Review → Approval). | 

## Actors and Responsibilities
- Identify the different roles involved and what they do in practice.

| Actor / Role | Responsibilities |
|-------------------|------------------------------------------------------------------------------------------------------------------------|
| Teacher / Faculty | Marking attendance, updating grades, monitoring the Class Performance Dashboard, and mentoring project milestones.     |
|      Student      | Tracking personal syllabus coverage/grades, uploading project milestones, and managing their digital calendar.         |
|  Institute Admin  | Managing RBAC roles, scheduling rooms/classes, tracking fee compliance, and generating automated parent reports.       | 

## Core workflows
Description of at least 2-3 real workflows as explained by the domain expert
- Workflow 1
  - Trigger/start condition
      A teacher enters a low grade or marks a student absent.
  - Steps involved (in order)
	    1. Data is written to the primary database.
      2. An asynchronous background job checks if the student's status hits a "Risk Threshold" (e.g., <75% attendance).
      3. The system triggers a notification via the Pub/Sub service.
      4. The teacher receives an alert on their dashboard.
  - Outcome / End condition
    	The teacher provides early support to the flagged student.

- Workflow 2
  - Trigger/start condition
	    Student completes a project phase.
  - Steps involved (in order)
	    1. Student uploads a file to the system.
      2. File is stored in a decoupled storage system (like AWS S3).
      3. The faculty is notified to review the submission.
      4. Faculty approves or requests revisions, updating the "State Machine" status.
  - Outcome / End condition
      The milestone is finalized and archived in the Digital Filing Cabinet.
 
- Workflow 3
  - Trigger/start condition
	    A scheduled time interval (e.g., end of month) or admin trigger.
  - Steps involved (in order)
    	1. System joins data from Student, Grade, and Attendance tables.
      2. A progress report is automatically generated.
      3. The report is dispatched via the integrated notification gateway.
  - Outcome / End condition
      Parents receive an up-to-date status report without manual teacher intervention.

## Rules, Constraints, and Exceptions
Document rules that govern how the domain operates.
  - Mandatory rules or policies:
      Every administrative action must be recorded in an Audit Log for accountability
  - Constraints or limitations:
      High-frequency writes (like 50 teachers marking attendance at once) require Concurrency Control (Optimistic Locking) to maintain data integrity.
  - Common exceptions or edge cases:
      Students who are "On Leave" must be distinguished from those "Absent" so they don't trigger false Alerts.
  - Situations where things usually go wrong: 
      Delays often occur if external Third-Party Gateways (like Calendars) experience downtime.
## Current challenges and pain points
- What parts of this process are most difficult or inefficient?
      Manually tracking whether a student is failing for weeks before anyone notices (the "Problem of Late Detection"). 
- Where do delays, errors, or misunderstandings usually occur?
      Managing room bookings and physical paper-based attendance logs often leads to scheduling overlaps and lost data.
- What information is hardest to track or manage today?
      The exact progress of long-term research projects (Honors/BTP) and coordinating real-time updates for parents.
 ## Assumptions & Clarifications
- What assumptions made by the team that were confirmed
      The team confirmed that Attendance and Assignment tracking are the core pillars of the system. It was validated that digital attendance must be marked in real-time and that assignments (specifically long-term BTP/Honors milestones) require a centralized "Digital Filing Cabinet" for secure storage and structured review.
- What assumptions that were corrected 
      Types of Assignments, Dynamic features which are not used, Student also	has to take effort in 2 way interactions, institution specific to more generalised
- Open questions that need follow-up
      What parameters are the true indicators of academic success, since different sets of parameters are used to judge success depending on the definition of academic progress and the analysis methodology used?

