-- database creation
drop database if exists ffsd;
create database ffsd;
use ffsd;

-- department table
create table department (
    department_id varchar(50) not null,
    department_name varchar(100) not null,
    department_code varchar(20) not null,

    constraint pk_department primary key (department_id),
    constraint uq_department_code unique (department_code)
);

-- users table 
create table users (
    user_id varchar(50) not null,
    username varchar(50) not null,
    password_hash varchar(255) not null,
    email varchar(100) not null,
    phone varchar(15),
    role varchar(20),
    created_at date,

    constraint pk_users primary key (user_id),
    constraint uq_users_username unique (username),
    constraint uq_users_email unique (email)
);

-- student (isa users)
create table student (
    user_id varchar(50) not null,
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

    constraint pk_student primary key (user_id),

    constraint fk_student_users
        foreign key (user_id)
        references users(user_id)
);

-- faculty (isa users)
create table faculty (
    user_id varchar(50) not null,
    first_name varchar(50),
    last_name varchar(50),
    designation varchar(50),
    department_id varchar(50) not null,
    qualification varchar(100),

    constraint pk_faculty primary key (user_id),

    constraint fk_faculty_users
        foreign key (user_id)
        references users(user_id),

    constraint fk_faculty_department
        foreign key (department_id)
        references department(department_id)
);

-- head (isa users)
create table head (
    user_id varchar(50) not null,
    first_name varchar(50),
    last_name varchar(50),
    privilege_level varchar(50),
    department_id varchar(50) not null,

    constraint pk_head primary key (user_id),

    constraint fk_head_users
        foreign key (user_id)
        references users(user_id),

    constraint fk_head_department
        foreign key (department_id)
        references department(department_id)
);

-- course table
create table course (
    course_id varchar(50) not null,
    course_name varchar(100) not null,
    course_code varchar(20) not null,
    credits int,
    objective text,
    faculty_id varchar(50) not null,

    constraint pk_course primary key (course_id),
    constraint uq_course_code unique (course_code),

    constraint fk_course_faculty
        foreign key (faculty_id)
        references faculty(user_id)
);

-- topic table
create table topic (
    topic_id varchar(50) not null,
    course_id varchar(50) not null,
    topic_name varchar(100),
    sequence_order int,
    status varchar(20),

    constraint pk_topic primary key (topic_id),

    constraint fk_topic_course
        foreign key (course_id)
        references course(course_id)
);

-- academic year table
create table academic_year (
    year_id varchar(50) not null,
    year_name varchar(20) not null,
    start_date date,
    end_date date,
    is_current varchar(10),

    constraint pk_academic_year primary key (year_id)
);

-- enrollment table
create table enrollment (
    enrollment_id varchar(50) not null,
    student_id varchar(50) not null,
    course_id varchar(50) not null,
    year_id varchar(50) not null,
    status varchar(20),
    section varchar(10),

    constraint pk_enrollment primary key (enrollment_id),

    constraint fk_enrollment_student
        foreign key (student_id)
        references student(user_id),

    constraint fk_enrollment_course
        foreign key (course_id)
        references course(course_id),

    constraint fk_enrollment_year
        foreign key (year_id)
        references academic_year(year_id)
);

-- assessment (generalization)
create table assessment (
    assessment_id varchar(50) not null,
    course_id varchar(50) not null,
    title varchar(100),
    type varchar(20),
    max_marks int,
    date date,
    weightage int,

    constraint pk_assessment primary key (assessment_id),

    constraint fk_assessment_course
        foreign key (course_id)
        references course(course_id)
);

-- exam (isa assessment)
create table exam (
    assessment_id varchar(50) not null,
    duration_minutes int,
    venue varchar(100),

    constraint pk_exam primary key (assessment_id),

    constraint fk_exam_assessment
        foreign key (assessment_id)
        references assessment(assessment_id)
);

-- quiz (isa assessment)
create table quiz (
    assessment_id varchar(50) not null,
    time_limit_minutes int,
    platform_link varchar(255),

    constraint pk_quiz primary key (assessment_id),

    constraint fk_quiz_assessment
        foreign key (assessment_id)
        references assessment(assessment_id)
);

-- assignment (isa assessment)
create table assignment (
    assessment_id varchar(50) not null,
    submission_deadline date,
    file_format_allowed varchar(50),

    constraint pk_assignment primary key (assessment_id),

    constraint fk_assignment_assessment
        foreign key (assessment_id)
        references assessment(assessment_id)
);

-- learning outcome
create table learning_outcome (
    outcome_id varchar(50) not null,
    course_id varchar(50) not null,
    description text,
    bloom_level varchar(20),

    constraint pk_learning_outcome primary key (outcome_id),

    constraint fk_lo_course
        foreign key (course_id)
        references course(course_id)
);

-- assessment outcome
create table assessment_outcome (
    assessment_id varchar(50) not null,
    outcome_id varchar(50) not null,
    weightage int,

    constraint pk_assessment_outcome
        primary key (assessment_id, outcome_id),

    constraint fk_ao_assessment
        foreign key (assessment_id)
        references assessment(assessment_id),

    constraint fk_ao_outcome
        foreign key (outcome_id)
        references learning_outcome(outcome_id)
);

-- marks entry
create table marks_entry (
    entry_id varchar(50) not null,
    enrollment_id varchar(50) not null,
    assessment_id varchar(50) not null,
    marks_obtained int,
    grade varchar(5),
    feedback_text text,

    constraint pk_marks_entry primary key (entry_id),

    constraint fk_marks_enrollment
        foreign key (enrollment_id)
        references enrollment(enrollment_id),

    constraint fk_marks_assessment
        foreign key (assessment_id)
        references assessment(assessment_id)
);

-- student outcome
create table student_outcome (
    enrollment_id varchar(50) not null,
    outcome_id varchar(50) not null,
    mastery_level float,
    last_assessed date,

    constraint pk_student_outcome
        primary key (enrollment_id, outcome_id),

    constraint fk_so_enrollment
        foreign key (enrollment_id)
        references enrollment(enrollment_id),

    constraint fk_so_outcome
        foreign key (outcome_id)
        references learning_outcome(outcome_id)
);

-- attendance log
create table attendance_log (
    log_id varchar(50) not null,
    enrollment_id varchar(50) not null,
    date date,
    status varchar(20),
    lecture_topic varchar(100),

    constraint pk_attendance primary key (log_id),

    constraint fk_attendance_enrollment
        foreign key (enrollment_id)
        references enrollment(enrollment_id)
);

-- leave request
create table leave_request (
    request_id varchar(50) not null,
    student_id varchar(50) not null,
    start_date date,
    end_date date,
    reason text,
    document_proof varchar(255),
    status varchar(20),
    approved_by varchar(50),

    constraint pk_leave_request primary key (request_id),

    constraint fk_leave_student
        foreign key (student_id)
        references student(user_id),

    constraint fk_leave_faculty
        foreign key (approved_by)
        references faculty(user_id)
);

-- research project
create table research_project (
    project_id varchar(50) not null,
    student_id varchar(50) not null,
    faculty_id varchar(50) not null,
    title varchar(200),
    domain varchar(100),
    start_date date,
    end_date date,

    constraint pk_research_project primary key (project_id),

    constraint fk_project_student
        foreign key (student_id)
        references student(user_id),

    constraint fk_project_faculty
        foreign key (faculty_id)
        references faculty(user_id)
);

-- research milestone
create table research_milestone (
    milestone_id varchar(50) not null,
    project_id varchar(50) not null,
    title varchar(200),
    submission_date date,
    file_path varchar(255),
    review_comments text,
    status varchar(20),

    constraint pk_research_milestone primary key (milestone_id),

    constraint fk_milestone_project
        foreign key (project_id)
        references research_project(project_id)
);

-- meeting slot
create table meeting_slot (
    slot_id varchar(50) not null,
    faculty_id varchar(50) not null,
    student_id varchar(50) not null,
    start_time datetime,
    end_time datetime,
    status varchar(20),

    constraint pk_meeting_slot primary key (slot_id),

    constraint fk_meeting_faculty
        foreign key (faculty_id)
        references faculty(user_id),

    constraint fk_meeting_student
        foreign key (student_id)
        references student(user_id)
);

-- resource
create table resource (
    resource_id varchar(50) not null,
    name varchar(100),
    capacity int,
    type varchar(50),
    location varchar(100),

    constraint pk_resource primary key (resource_id)
);

-- event
create table event (
    event_id varchar(50) not null,
    resource_id varchar(50) not null,
    head_id varchar(50) not null,
    title varchar(200),
    start_time datetime,
    end_time datetime,
    event_type varchar(50),

    constraint pk_event primary key (event_id),

    constraint fk_event_resource
        foreign key (resource_id)
        references resource(resource_id),

    constraint fk_event_head
        foreign key (head_id)
        references head(user_id)
);

-- fee structure
create table fee_structure (
    fee_id varchar(50) not null,
    branch varchar(50),
    year_id varchar(50) not null,
    amount int,
    due_date date,
    category varchar(50),

    constraint pk_fee_structure primary key (fee_id),

    constraint fk_fee_year
        foreign key (year_id)
        references academic_year(year_id)
);

-- fee payment
create table fee_payment (
    payment_id varchar(50) not null,
    student_id varchar(50) not null,
    fee_id varchar(50) not null,
    transaction_id varchar(100),
    amount_paid int,
    payment_date date,
    status varchar(20),

    constraint pk_fee_payment primary key (payment_id),

    constraint fk_payment_student
        foreign key (student_id)
        references student(user_id),

    constraint fk_payment_fee
        foreign key (fee_id)
        references fee_structure(fee_id)
);

-- forum post
create table forum_post (
    post_id varchar(50) not null,
    user_id varchar(50) not null,
    course_id varchar(50) not null,
    topic_id varchar(50) not null,
    content text,
    timestamp datetime,

    constraint pk_forum_post primary key (post_id),

    constraint fk_post_users
        foreign key (user_id)
        references users(user_id),

    constraint fk_post_course
        foreign key (course_id)
        references course(course_id),

    constraint fk_post_topic
        foreign key (topic_id)
        references topic(topic_id)
);

-- post tag
create table post_tag (
    post_id varchar(50) not null,
    tag_name varchar(50) not null,

    constraint pk_post_tag
        primary key (post_id, tag_name),

    constraint fk_posttag_post
        foreign key (post_id)
        references forum_post(post_id)
);