# Database Design

This folder contains the complete database design for the project, including the Entity-Relationship (ER) diagrams across different design phases and the final database schema.

# Overview

The database design was developed in three phases to progressively refine the structure of the system. Each phase builds upon the previous one, ultimately resulting in a fully normalized ER model used to derive the final relational database schema.

---

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
