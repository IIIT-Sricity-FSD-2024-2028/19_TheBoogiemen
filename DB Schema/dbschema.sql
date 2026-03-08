-- =============================
-- database creation
-- =============================
drop database if exists ffsd;
create database ffsd;
use ffsd;

-- =============================
-- user table
-- =============================

create table user (
    user_id varchar(50) primary key,
    username varchar(50) unique not null,
    password_hash varchar(255) not null,
    email varchar(100) unique not null,
    phone varchar(15),
    role varchar(20),
    created_at date
);

-- =============================
-- department
-- =============================

create table department (
    department_id varchar(50) primary key,
    department_name varchar(100),
    department_code varchar(20) unique,
    head_of_dept varchar(100)
);

-- =============================
-- student (isa user)
-- =============================

create table student (
    user_id varchar(50) primary key,
    first_name varchar(50),
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
    foreign key (user_id) references user(user_id)
);

-- =============================
-- faculty (isa user)
-- =============================

create table faculty (
    user_id varchar(50) primary key,
    first_name varchar(50),
    last_name varchar(50),
    designation varchar(50),
    department_id varchar(50),
    qualification varchar(100),
    foreign key (user_id) references user(user_id),
    foreign key (department_id) references department(department_id)
);

-- =============================
-- admin (isa user)
-- =============================

create table admin (
    user_id varchar(50) primary key,
    first_name varchar(50),
    last_name varchar(50),
    privilege_level varchar(50),
    department_id varchar(50),
    foreign key (user_id) references user(user_id),
    foreign key (department_id) references department(department_id)
);

-- =============================
-- course
-- =============================

create table course (
    course_id varchar(50) primary key,
    course_name varchar(100),
    course_code varchar(20) unique,
    credits int,
    objective text,
    faculty_id varchar(50),
    foreign key (faculty_id) references faculty(user_id)
);

-- =============================
-- topic
-- =============================

create table topic (
    topic_id varchar(50) primary key,
    course_id varchar(50),
    topic_name varchar(100),
    sequence_order int,
    status varchar(20),
    foreign key (course_id) references course(course_id)
);

-- =============================
-- academic year
-- =============================

create table academic_year (
    year_id varchar(50) primary key,
    year_name varchar(20),
    start_date date,
    end_date date,
    is_current varchar(10)
);

-- =============================
-- enrollment
-- =============================

create table enrollment (
    enrollment_id varchar(50) primary key,
    student_id varchar(50),
    course_id varchar(50),
    year_id varchar(50),
    status varchar(20),
    section varchar(10),
    foreign key (student_id) references student(user_id),
    foreign key (course_id) references course(course_id),
    foreign key (year_id) references academic_year(year_id)
);

-- =============================
-- assessment
-- =============================

create table assessment (
    assessment_id varchar(50) primary key,
    course_id varchar(50),
    title varchar(100),
    type varchar(20),
    max_marks int,
    date date,
    weightage int,
    foreign key (course_id) references course(course_id)
);

-- =============================
-- exam (isa assessment)
-- =============================

create table exam (
    assessment_id varchar(50) primary key,
    duration_minutes int,
    venue varchar(100),
    foreign key (assessment_id) references assessment(assessment_id)
);

-- =============================
-- quiz (isa assessment)
-- =============================

create table quiz (
    assessment_id varchar(50) primary key,
    time_limit_minutes int,
    platform_link varchar(255),
    foreign key (assessment_id) references assessment(assessment_id)
);

-- =============================
-- assignment (isa assessment)
-- =============================

create table assignment (
    assessment_id varchar(50) primary key,
    submission_deadline date,
    file_format_allowed varchar(50),
    foreign key (assessment_id) references assessment(assessment_id)
);

-- =============================
-- learning outcome
-- =============================

create table learning_outcome (
    outcome_id varchar(50) primary key,
    course_id varchar(50),
    description text,
    bloom_level varchar(20),
    foreign key (course_id) references course(course_id)
);

-- =============================
-- assessment outcome
-- =============================

create table assessment_outcome (
    assessment_id varchar(50),
    outcome_id varchar(50),
    weightage int,
    primary key (assessment_id, outcome_id),
    foreign key (assessment_id) references assessment(assessment_id),
    foreign key (outcome_id) references learning_outcome(outcome_id)
);

-- =============================
-- marks entry
-- =============================

create table marks_entry (
    entry_id varchar(50) primary key,
    enrollment_id varchar(50),
    assessment_id varchar(50),
    marks_obtained int,
    grade varchar(5),
    feedback_text text,
    foreign key (enrollment_id) references enrollment(enrollment_id),
    foreign key (assessment_id) references assessment(assessment_id)
);

-- =============================
-- student outcome
-- =============================

create table student_outcome (
    enrollment_id varchar(50),
    outcome_id varchar(50),
    mastery_level float,
    last_assessed date,
    primary key (enrollment_id, outcome_id),
    foreign key (enrollment_id) references enrollment(enrollment_id),
    foreign key (outcome_id) references learning_outcome(outcome_id)
);

-- =============================
-- attendance log
-- =============================

create table attendance_log (
    log_id varchar(50) primary key,
    enrollment_id varchar(50),
    date date,
    status varchar(20),
    lecture_topic varchar(100),
    foreign key (enrollment_id) references enrollment(enrollment_id)
);

-- =============================
-- leave request
-- =============================

create table leave_request (
    request_id varchar(50) primary key,
    student_id varchar(50),
    start_date date,
    end_date date,
    reason text,
    document_proof varchar(255),
    status varchar(20),
    approved_by varchar(50),
    foreign key (student_id) references student(user_id),
    foreign key (approved_by) references faculty(user_id)
);

-- =============================
-- research project
-- =============================

create table research_project (
    project_id varchar(50) primary key,
    student_id varchar(50),
    faculty_id varchar(50),
    title varchar(200),
    domain varchar(100),
    start_date date,
    end_date date,
    foreign key (student_id) references student(user_id),
    foreign key (faculty_id) references faculty(user_id)
);

-- =============================
-- research milestone
-- =============================

create table research_milestone (
    milestone_id varchar(50) primary key,
    project_id varchar(50),
    title varchar(200),
    submission_date date,
    file_path varchar(255),
    review_comments text,
    status varchar(20),
    foreign key (project_id) references research_project(project_id)
);

-- =============================
-- meeting slot
-- =============================

create table meeting_slot (
    slot_id varchar(50) primary key,
    faculty_id varchar(50),
    student_id varchar(50),
    start_time datetime,
    end_time datetime,
    status varchar(20),
    foreign key (faculty_id) references faculty(user_id),
    foreign key (student_id) references student(user_id)
);

-- =============================
-- resource
-- =============================

create table resource (
    resource_id varchar(50) primary key,
    name varchar(100),
    capacity int,
    type varchar(50),
    location varchar(100)
);

-- =============================
-- event
-- =============================

create table event (
    event_id varchar(50) primary key,
    resource_id varchar(50),
    admin_id varchar(50),
    title varchar(200),
    start_time datetime,
    end_time datetime,
    event_type varchar(50),
    foreign key (resource_id) references resource(resource_id),
    foreign key (admin_id) references admin(user_id)
);

-- =============================
-- fee structure
-- =============================

create table fee_structure (
    fee_id varchar(50) primary key,
    branch varchar(50),
    year_id varchar(50),
    amount int,
    due_date date,
    category varchar(50),
    foreign key (year_id) references academic_year(year_id)
);

-- =============================
-- fee payment
-- =============================

create table fee_payment (
    payment_id varchar(50) primary key,
    student_id varchar(50),
    fee_id varchar(50),
    transaction_id varchar(100),
    amount_paid int,
    payment_date date,
    status varchar(20),
    foreign key (student_id) references student(user_id),
    foreign key (fee_id) references fee_structure(fee_id)
);

-- =============================
-- forum post
-- =============================

create table forum_post (
    post_id varchar(50) primary key,
    user_id varchar(50),
    course_id varchar(50),
    topic_id varchar(50),
    content text,
    timestamp datetime,
    foreign key (user_id) references user(user_id),
    foreign key (course_id) references course(course_id),
    foreign key (topic_id) references topic(topic_id)
);

-- =============================
-- post tag
-- =============================

create table post_tag (
    post_id varchar(50),
    tag_name varchar(50),
    primary key (post_id, tag_name),
    foreign key (post_id) references forum_post(post_id)
);

