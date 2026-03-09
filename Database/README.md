# Database Design

This folder contains the complete database design for the project, including the Entity-Relationship (ER) diagrams across different design phases and the final database schema.

# Overview

The database design was developed in three phases to progressively refine the structure of the system. Each phase builds upon the previous one, ultimately resulting in a fully normalized ER model used to derive the final relational database schema.

---

## 🦶 Understanding Our ER Diagram: Crow's Foot Notation

To accurately represent the complex relationships within the BarelyPassing platform, our Entity-Relationship (ER) diagram utilizes **Crow's Foot Notation**. This is the industry standard for modeling relational databases because it clearly defines both **cardinality** (the maximum number of related records) and **modality/optionality** (the minimum number of related records).

### The Symbols Explained
The symbols at the ends of the relationship lines dictate how tables interact. We use four primary connectors in our system:

* **`||` (Exactly One / Mandatory One):** The record *must* have exactly one associated record in the other table. 
* **`|o` (Zero or One / Optional One):** The record *may* have one associated record, or it may have none.
* **`}|` (One or Many / Mandatory Many):** The record *must* have at least one associated record, but can have multiple.
* **`}o` (Zero or Many / Optional Many):** The record can have multiple associated records, or it might not have any yet. (The "crow's foot" shape represents "many").

---

### How this applies to the BarelyPassing Schema

Here are three core examples of how we applied these rules to our specific database logic:

**1. Mandatory One-to-Many (1:M) — *The Standard Relationship***
> `FACULTY ||--o{ COURSE`
* **Read as:** "One Faculty member teaches zero or many Courses."
* **Logic:** The `||` on the Faculty side means a Course *must* have exactly one Professor teaching it (it cannot exist in a void). The `}o` on the Course side means a Faculty member might be teaching multiple courses, or (if they are on sabbatical) zero courses.

**2. One-to-One (1:1) / IS-A Inheritance — *Role-Based Access***
> `USER ||--|| STUDENT`
* **Read as:** "One User is exactly one Student."
* **Logic:** We used `||` on both sides to represent subclass inheritance. A `STUDENT` entity cannot exist without a base `USER` authentication record, and that specific `USER` record maps to exactly one `STUDENT` profile.

**3. Optional Booking (0..M) — *Scheduling Logic***
> `STUDENT |o--o{ MEETING_SLOT`
* **Read as:** "One Student books zero or many Meeting Slots."
* **Logic:** The `|o` on the Student side is crucial here. A `MEETING_SLOT` is created by a Faculty member and initially has *no* student attached to it (it is available). Therefore, the relationship to a student is **optional** (Zero or One) until a student actually books it. 

By strictly adhering to these notation rules, our ER diagram acts as an exact blueprint for the Foreign Key constraints built into our SQL schema.

# Phase 1 – Initial Entity Identification

In Phase 1, the primary goal was to identify all strong and weak entity sets present in the system along with their relationships and cardinalities.

Key characteristics of this phase:

* Identification of core entities involved in the system.
* Definition of weak entities where applicable.
* Establishment of relationships and cardinalities between entities.
* No normalization was applied at this stage.

The ER diagram for this phase provides a conceptual representation of the system's entities and relationships.

---

# Phase 2 – Specialization and Generalization

Phase 2 introduces specialization (IS-A relationships) to refine the entity hierarchy.

Examples include:

* Student IS-A User
* Faculty IS-A User
* Admin IS-A User

Key features of this phase:

* Introduction of inheritance relationships (IS-A).
* Improved modeling of entity hierarchies.
* Maintenance of previously defined strong and weak entities.
* Relationships between entities are further clarified.

The ER diagram in this phase represents a more structured conceptual model of the system.

---

# Phase 3 – Normalization and Final ER Model

In Phase 3, the ER model was normalized to remove redundancy and ensure data integrity.

Normalization steps performed:

* First Normal Form (1NF) – Removal of repeating groups and ensuring atomic attributes.
* Second Normal Form (2NF) – Elimination of partial dependencies.
* Third Normal Form (3NF) – Removal of transitive dependencies.
* Boyce–Codd Normal Form (BCNF) – Ensuring stronger dependency constraints.

This phase produces the final normalized ER diagram, which is used to derive the relational database schema.

---

# Database Schema

The file 'dbschema.sql' contains the SQL statements required to create the database from scratch.

The schema includes:

* `CREATE DATABASE` statement
* `CREATE TABLE` statements
* Primary Keys
* Foreign Keys
* Unique constraints
* Other attribute constraints

Executing the schema file will create a clean database instance with all tables and relationships defined, corresponding directly to the final ER diagram from Phase 3.

Running the Schema

To create the database locally:

```bash
mysql -u root -p < dbschema.sql


Alternatively, inside MySQL:

mysql> source dbschema.sql;
```
This will create the database and all tables automatically.

---

# Folder Structure

Database/
│
├── Phase1/
│   └── ER_Diagram.svg
│
├── Phase2/
│   └── ER_Diagram.svg
│
├── Phase3/
│   └── ER_Final.svg
│
└── dbschema.sql

---

# Summary

The database design follows a structured approach:

1. Entity identification (Phase 1)
2. Specialization and hierarchy modeling (Phase 2)
3. Normalization and final schema derivation (Phase 3)

The final schema is fully normalized and maintains a direct correspondence with the Phase-3 ER diagram.
