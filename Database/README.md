# Database Design

This folder contains the complete database design for the project, including the Entity-Relationship (ER) diagrams across different design phases and the final database schema.

# Overview

The database design was developed in three phases to progressively refine the structure of the system. Each phase builds upon the previous one, ultimately resulting in a fully normalized ER model used to derive the final relational database schema.

---

# Chen's Notation in ERD (DBMS)

We have used the Chen's notation in our database ERD to clearly represent the structure of the database and the relationships between different entities. The following points explain the important aspects of Chen's notation used in our ER diagram.

---

## 1. Entities
Entities represent real-world objects or concepts in the system.  
In Chen’s notation, entities are represented using **rectangles**.

**Example:**  
Student, Course, Employee

---

## 2. Attributes
Attributes describe the properties or characteristics of an entity.  
They are represented using **ovals** connected to their respective entities.

**Example attributes of Student:**  
- Name  
- Age  
- Roll Number  

---

## 3. Primary Key Attribute
The attribute that uniquely identifies each entity instance is called the **primary key**.  
In Chen’s notation, the primary key is represented by **underlining the attribute name**.

**Example:**  
`Student_ID`

---

## 4. Composite Attributes
Some attributes can be divided into smaller sub-attributes.  
These are called **composite attributes** and are shown using **multiple connected ovals**.

**Example:**  
Name  
- First_Name  
- Last_Name  

---

## 5. Multivalued Attributes
Attributes that can have multiple values for a single entity are called **multivalued attributes**.  
They are represented using **double ovals**.

**Example:**  
Phone Numbers of a Student

---

## 6. Derived Attributes
Derived attributes are calculated from other attributes in the database.  
They are represented using **dashed ovals**.

**Example:**  
Age derived from Date_of_Birth

---

## 7. Relationships
Relationships describe how two or more entities are associated with each other.  
In Chen’s notation, relationships are represented using **diamonds**.

**Example:**  
Student **enrolls in** Course

---

## 8. Cardinality
Cardinality defines the number of instances of one entity that can be associated with instances of another entity.

Common types include:

| Type | Meaning |
|-----|--------|
| One-to-One (1:1) | One entity instance relates to one instance of another |
| One-to-Many (1:N) | One entity relates to multiple entities |
| Many-to-Many (M:N) | Multiple entities relate to multiple entities |

---

## 9. Participation Constraints
Participation indicates whether the participation of an entity in a relationship is **mandatory or optional**.

Types of participation:

- **Total Participation** – Every entity must participate in the relationship.
- **Partial Participation** – Some entities may or may not participate.

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
