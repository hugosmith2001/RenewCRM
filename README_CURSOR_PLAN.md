nsurance Broker CRM – MVP Implementation Plan
1. Project Overview

This project is an MVP Phase 1 of a multi-tenant CRM system specifically designed for insurance brokers.

The goal is to build a system that allows insurance brokerages to manage:

customers

contact persons

insured objects

insurance policies

documents

activities

tasks and reminders

renewal dates

The system should centralize broker operations that are currently spread across:

spreadsheets

emails

PDF documents

calendars

simple CRMs

This project should be built incrementally in phases using Cursor.

2. MVP Objective

The MVP must allow a brokerage to:

log in securely

manage customers

add contact persons

register insured objects

register policies manually

upload policy documents

create activities/notes

create tasks/reminders

track renewal dates

search and filter core data

The system should provide a single customer view where all relevant information can be accessed.

3. Technology Stack

The MVP should be implemented using the following stack:

Frontend

Next.js

TypeScript

Tailwind CSS

shadcn/ui (optional)

Backend

Next.js API routes or server actions

Database

PostgreSQL

ORM

Prisma

Storage

Object storage (S3 compatible or equivalent)

Validation

Zod

Architecture style

Modular monolith

Do NOT implement microservices.

4. Architecture Principles
4.1 Multi-Tenant Architecture

This system is multi-tenant.

Each brokerage is a tenant.

Rules:

All business data must contain tenantId

All queries must filter by tenantId

Users must never access another tenant's data

Authorization must enforce tenant boundaries

4.2 Authorization

Authorization must be implemented in the backend.

Do not rely only on frontend checks.

Roles:

Admin

full access within tenant

Broker

manage customers, policies, activities, tasks

Staff

limited read/write access depending on implementation

4.3 Validation

All input should be validated.

Prefer:

Zod schemas for request validation.

4.4 Folder Structure

Use a modular architecture.

Example modules:

auth

tenants

users

customers

contacts

insured-objects

policies

documents

activities

tasks

audit

Avoid putting all logic in one file.

4.5 Code Quality

Code should be:

strongly typed

modular

maintainable

production-style

easy to extend

Avoid shortcuts that break architecture.

5. Scope for MVP Phase 1

The following modules are in scope:

authentication

tenants

users

customers

contacts

insured objects

policies

documents

activities

tasks

basic audit logging

search and filtering

6. Out of Scope for MVP

The following features must NOT be built yet:

BankID

e-signature integration

insurer API integrations

commission/provision engine

invoicing

customer portal

claims workflow

AI PDF extraction

advanced compliance workflows

BI dashboards

advanced reporting

email sync

These will come in future phases.

7. Domain Model Overview

The core domain entities are:

Tenant
User
Customer
CustomerContact
InsuredObject
Policy
Insurer
Document
Activity
Task
AuditEvent

Relationships:

Tenant → Users
Tenant → Customers
Customer → Contacts
Customer → InsuredObjects
Customer → Policies
Policy → InsuredObjects
Policy → Documents
Customer → Activities
Customer → Tasks

8. Implementation Phases

The system will be implemented in phases.

Cursor should only implement one phase at a time.

Phase 0 — Project Foundation

Goal:

Set up the technical foundation of the project.

Implement:

Next.js project structure

TypeScript setup

Tailwind CSS

Prisma configuration

PostgreSQL connection

environment configuration

base layout

modular folder structure

Do NOT implement business logic yet.

Phase 1 — Auth, Tenants and Roles

Goal:

Create authentication and tenant infrastructure.

Implement:

Tenant model
User model
Role system

Features:

login

logout

session handling

current user helper

current tenant helper

protected routes

backend authorization helpers

Do NOT implement customers or policies yet.

Phase 2 — Customers

Goal:

Create the customer management module.

Implement:

Customer model

Fields may include:

name

type (private/company)

contact info

address

owner broker

status

Features:

customer CRUD

customer list page

customer detail page

basic search

tenant filtering

Phase 3 — Contact Persons

Goal:

Allow multiple contacts per customer.

Implement:

CustomerContact model.

Features:

add contact person

edit contact person

delete contact person

mark primary contact

Contacts must belong to a customer.

Phase 4 — Insured Objects

Goal:

Represent the items being insured.

Implement:

InsuredObject model.

Examples:

property

vehicle

person

business

equipment

Features:

create object

edit object

link object to customer

Phase 5 — Policies

Goal:

Implement insurance policy management.

Implement:

Insurer model
Policy model

Fields may include:

policy number

insurer

premium

start date

end date

renewal date

policy status

Features:

policy CRUD

link policy to customer

link policy to insured objects

Phase 6 — Documents

Goal:

Implement document management.

Implement:

Document model.

Features:

file upload

object storage integration

metadata storage

document type

link documents to customers or policies

secure file access

Phase 7 — Activities and Tasks

Goal:

Track broker work and communication.

Implement:

Activity model
Task model

Activity types may include:

call

meeting

email

note

advice

Tasks:

due date

priority

status

assignment

Phase 8 — Audit and Hardening

Goal:

Improve reliability and security.

Implement:

AuditEvent model.

Track:

create

update

upload actions

Also improve:

validation

permission checks

tenant isolation

error handling

9. Coding Rules for Cursor

When implementing a phase:

Only implement the requested phase.

Do not implement future phases.

Always enforce tenant isolation.

Always enforce backend authorization.

Use typed models and validation.

Follow the modular structure.

After implementing a phase, provide:

summary of implementation

files created

database models added

endpoints added

components/pages added

suggested next phase

10. Definition of Done for MVP

The MVP is considered complete when a user can:

log in

create customers

add contact persons

add insured objects

create policies

upload documents

log activities

create tasks

search/filter records

view all customer-related information in one system

And:

tenant data is fully isolated

authorization works

basic audit logging exists