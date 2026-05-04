-- database initialization
drop database if exists ffsd;
create database ffsd;
use ffsd;

---------------------------------------------------------
-- 1. base identity & role tables
---------------------------------------------------------

create table department (
    department_id varchar(50) not null,
    department_name varchar(100) not null,
    department_code varchar(20) not null,
    constraint pk_department primary key (department_id),
    constraint uq_department_code unique (department_code)
);

create table users (
    user_id varchar(50) not null,
    username varchar(50) not null,
    password_hash varchar(255) not null,
    email varchar(100) not null,
    phone varchar(15),
    role enum('student', 'faculty', 'head', 'admin') not null,
    created_at datetime default current_timestamp,
    constraint pk_users primary key (user_id),
    constraint uq_users_username unique (username),
    constraint uq_users_email unique (email)
);

create table student (
    user_id varchar(50) not null,
    first_name varchar(50) not null,
    last_name varchar(50),
    dob date,
    gender varchar(10),
    street varchar(100),
    city varchar(50),
    state varchar(50),
    zip_code varchar(10),
    branch varchar(50),
    parent_contact varchar(15),
    join_date date,
    batch varchar(20),
    constraint pk_student primary key (user_id),
    constraint fk_student_users foreign key (user_id) references users(user_id) on delete cascade
);

create table faculty (
    user_id varchar(50) not null,
    first_name varchar(50) not null,
    last_name varchar(50),
    designation varchar(50),
    department_id varchar(50) not null,
    qualification varchar(100),
    constraint pk_faculty primary key (user_id),
    constraint fk_faculty_users foreign key (user_id) references users(user_id) on delete cascade,
    constraint fk_faculty_department foreign key (department_id) references department(department_id)
);

create table head (
    user_id varchar(50) not null,
    first_name varchar(50),
    last_name varchar(50),
    privilege_level int,
    department_id varchar(50) not null,
    constraint pk_head primary key (user_id),
    constraint fk_head_users foreign key (user_id) references users(user_id) on delete cascade,
    constraint fk_head_department foreign key (department_id) references department(department_id)
);

---------------------------------------------------------
-- 2. academic structure
---------------------------------------------------------

create table academic_year (
    year_id varchar(50) not null,
    year_name varchar(20) not null,
    start_date date,
    end_date date,
    is_current boolean default false,
    constraint pk_academic_year primary key (year_id)
);

create table course (
    course_id varchar(50) not null,
    course_name varchar(100) not null,
    course_code varchar(20) not null,
    credits int,
    objective text,
    faculty_id varchar(50) not null,
    constraint pk_course primary key (course_id),
    constraint uq_course_code unique (course_code),
    constraint fk_course_faculty foreign key (faculty_id) references faculty(user_id)
);

create table topic (
    topic_id varchar(50) not null,
    course_id varchar(50) not null,
    topic_name varchar(100),
    sequence_order int,
    status enum('pending', 'in-progress', 'completed'),
    constraint pk_topic primary key (topic_id),
    constraint fk_topic_course foreign key (course_id) references course(course_id)
);

create table learning_outcome (
    outcome_id varchar(50) not null,
    course_id varchar(50) not null,
    description text,
    bloom_level varchar(20),
    constraint pk_learning_outcome primary key (outcome_id),
    constraint fk_lo_course foreign key (course_id) references course(course_id)
);

---------------------------------------------------------
-- 3. enrollment & tracking
---------------------------------------------------------

create table enrollment (
    enrollment_id varchar(50) not null,
    student_id varchar(50) not null,
    course_id varchar(50) not null,
    year_id varchar(50) not null,
    status varchar(20),
    section varchar(10),
    constraint pk_enrollment primary key (enrollment_id),
    constraint fk_enrollment_student foreign key (student_id) references student(user_id),
    constraint fk_enrollment_course foreign key (course_id) references course(course_id),
    constraint fk_enrollment_year foreign key (year_id) references academic_year(year_id)
);

create table attendance_log (
    log_id varchar(50) not null,
    enrollment_id varchar(50) not null,
    date date not null,
    status enum('present', 'absent', 'excused'),
    lecture_topic varchar(100),
    constraint pk_attendance primary key (log_id),
    constraint fk_attendance_enrollment foreign key (enrollment_id) references enrollment(enrollment_id)
);

create table student_outcome (
    enrollment_id varchar(50) not null,
    outcome_id varchar(50) not null,
    mastery_level float,
    last_assessed date,
    constraint pk_student_outcome primary key (enrollment_id, outcome_id),
    constraint fk_so_enrollment foreign key (enrollment_id) references enrollment(enrollment_id),
    constraint fk_so_outcome foreign key (outcome_id) references learning_outcome(outcome_id)
);

---------------------------------------------------------
-- 4. assessments
---------------------------------------------------------

create table assessment (
    assessment_id varchar(50) not null,
    course_id varchar(50) not null,
    title varchar(100),
    type enum('exam', 'quiz', 'assignment'),
    max_marks int,
    date date,
    weightage int,
    constraint pk_assessment primary key (assessment_id),
    constraint fk_assessment_course foreign key (course_id) references course(course_id)
);

create table exam (
    assessment_id varchar(50) not null,
    duration_minutes int,
    venue varchar(100),
    constraint pk_exam primary key (assessment_id),
    constraint fk_exam_assessment foreign key (assessment_id) references assessment(assessment_id)
);

create table quiz (
    assessment_id varchar(50) not null,
    time_limit_minutes int,
    platform_link varchar(255),
    constraint pk_quiz primary key (assessment_id),
    constraint fk_quiz_assessment foreign key (assessment_id) references assessment(assessment_id)
);

create table assignment (
    assessment_id varchar(50) not null,
    submission_deadline datetime,
    file_format_allowed varchar(50),
    constraint pk_assignment primary key (assessment_id),
    constraint fk_assignment_assessment foreign key (assessment_id) references assessment(assessment_id)
);

create table assessment_outcome (
    assessment_id varchar(50) not null,
    outcome_id varchar(50) not null,
    weightage int,
    constraint pk_assessment_outcome primary key (assessment_id, outcome_id),
    constraint fk_ao_assessment foreign key (assessment_id) references assessment(assessment_id),
    constraint fk_ao_outcome foreign key (outcome_id) references learning_outcome(outcome_id)
);

create table marks_entry (
    entry_id varchar(50) not null,
    enrollment_id varchar(50) not null,
    assessment_id varchar(50) not null,
    marks_obtained float,
    grade varchar(5),
    feedback_text text,
    constraint pk_marks_entry primary key (entry_id),
    constraint fk_marks_enrollment foreign key (enrollment_id) references enrollment(enrollment_id),
    constraint fk_marks_assessment foreign key (assessment_id) references assessment(assessment_id)
);

---------------------------------------------------------
-- 5. administrative modules
---------------------------------------------------------

create table resource (
    resource_id varchar(50) not null,
    name varchar(100),
    capacity int,
    type varchar(50),
    location varchar(100),
    constraint pk_resource primary key (resource_id)
);

create table event (
    event_id varchar(50) not null,
    resource_id varchar(50) not null,
    head_id varchar(50) not null,
    title varchar(200),
    start_time datetime,
    end_time datetime,
    event_type varchar(50),
    constraint pk_event primary key (event_id),
    constraint fk_event_resource foreign key (resource_id) references resource(resource_id),
    constraint fk_event_head foreign key (head_id) references head(user_id)
);

create table leave_request (
    request_id varchar(50) not null,
    student_id varchar(50) not null,
    start_date date,
    end_date date,
    reason text,
    document_proof varchar(255),
    status enum('pending', 'approved', 'rejected'),
    approved_by varchar(50),
    constraint pk_leave_request primary key (request_id),
    constraint fk_leave_student foreign key (student_id) references student(user_id),
    constraint fk_leave_faculty foreign key (approved_by) references faculty(user_id)
);

create table fee_structure (
    fee_id varchar(50) not null,
    branch varchar(50),
    year_id varchar(50) not null,
    amount int,
    due_date date,
    category varchar(50),
    constraint pk_fee_structure primary key (fee_id),
    constraint fk_fee_year foreign key (year_id) references academic_year(year_id)
);

create table fee_payment (
    payment_id varchar(50) not null,
    student_id varchar(50) not null,
    fee_id varchar(50) not null,
    transaction_id varchar(100) unique,
    amount_paid int,
    payment_date datetime,
    status enum('success', 'pending', 'failed'),
    constraint pk_fee_payment primary key (payment_id),
    constraint fk_payment_student foreign key (student_id) references student(user_id),
    constraint fk_payment_fee foreign key (fee_id) references fee_structure(fee_id)
);

---------------------------------------------------------
-- 6. research & forums
---------------------------------------------------------

create table research_project (
    project_id varchar(50) not null,
    student_id varchar(50) not null,
    faculty_id varchar(50) not null,
    title varchar(200),
    domain varchar(100),
    start_date date,
    end_date date,
    constraint pk_research_project primary key (project_id),
    constraint fk_project_student foreign key (student_id) references student(user_id),
    constraint fk_project_faculty foreign key (faculty_id) references faculty(user_id)
);

create table research_milestone (
    milestone_id varchar(50) not null,
    project_id varchar(50) not null,
    title varchar(200),
    submission_date datetime,
    file_path varchar(255),
    review_comments text,
    status enum('submitted', 'reviewed', 'approved'),
    constraint pk_research_milestone primary key (milestone_id),
    constraint fk_milestone_project foreign key (project_id) references research_project(project_id)
);

create table forum_post (
    post_id varchar(50) not null,
    user_id varchar(50) not null,
    course_id varchar(50) not null,
    topic_id varchar(50) not null,
    content text,
    timestamp datetime default current_timestamp,
    constraint pk_forum_post primary key (post_id),
    constraint fk_post_users foreign key (user_id) references users(user_id),
    constraint fk_post_course foreign key (course_id) references course(course_id),
    constraint fk_post_topic foreign key (topic_id) references topic(topic_id)
);

create table post_tag (
    post_id varchar(50) not null,
    tag_name varchar(50) not null,
    constraint pk_post_tag primary key (post_id, tag_name),
    constraint fk_posttag_post foreign key (post_id) references forum_post(post_id) on delete cascade
);