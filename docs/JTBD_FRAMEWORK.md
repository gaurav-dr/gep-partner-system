## Jobs to be Done (JTBD) Framework

### Primary JTBD (Production-Ready)

"When I need to manage health & safety service delivery from
project creation in Softone through to SEPE reporting and invoice approval, I
want an intelligent system that automates scheduling, ensures compliance, and
provides seamless partner collaboration, so I can scale operations efficiently
while maintaining regulatory adherence and service quality."

### Critical Workflow Jobs

#### For Account Coordinators (ACD)

🤖 AI-Assisted Partner
Assignment: "Get intelligent partner suggestions based on location, cost,
availability, and performance"

📅 Schedule Oversight:
"Monitor and approve partner schedules with 5-day completion
tracking"

🔄 Change Management:
"Handle partner and coordinator-initiated schedule changes
efficiently"

📊 SEPE Compliance:
"Automatically generate and export schedules to Greek government
systems"

#### For Partners/Consultants

📱 Flexible Scheduling:
"Create schedules through calendar interface with AI suggestions and
recurring patterns"

💰 Rate Management:
"Set and lock hourly rates with transparent approval workflow"

📋 Visit Management:
"Track, complete, and submit visits for approval with document
attachments"

🔄 Change Requests:
"Request schedule changes with justification and tracking"

#### For Internal Audit Team

✅ Visit Approval:
"Review and approve completed visits with cost validation"

10. 📄 Document Management: "Process visit
    documentation (Δελτία Επίσκεψης) efficiently"
11. 💰 Cost Control: "Validate partner rates
    and additional expenses"

## Product Requirements Framework

### Phase I Core Requirements

#### 1. AI-Powered Partner Assignment Engine

Priority: Critical | POC Status: Validated | Data Insight: Performance
variance requires intelligent matching

| Feature                 | Requirement                                                        | Data-Driven Logic                                   |
| ----------------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| 🎯Smart Suggestions     | Multi-factor algorithm (location, cost, availability, performance) | Address 46% Athens concentration + performance gaps |
| 🔄Renewal Priority      | Previous partner gets precedence for contract renewals             | Maintain continuity while optimizing performance    |
| ⏰Availability Matching | Installation work hours alignment with partner schedules           | Ensure scheduling feasibility from day one          |
| 📊Performance Weighting | Historical completion rate influence on assignments                | Prioritize 86.5% performers over 0% performers      |

#### 2. Advanced Calendar & Scheduling System

Priority: Critical | POC Status: Core functionality validated

| Feature                    | Requirement                                            | Business Logic                                              |
| -------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| 🗓️Multi-View Calendar    | Monthly, weekly, daily views with drag-and-drop        | Handle 4.03h average visits across varied patterns          |
| 🔄Recurring Schedules      | Rule-based recurring with AI optimization              | Automate repetitive scheduling while maintaining compliance |
| ⚠️Conflict Prevention    | Zero-overlap validation with customizable buffer       | Prevent scheduling conflicts entirely                       |
| 🎯Hour Matching            | Exact hour allocation matching (Assigned = Programmed) | Maintain 95.9% utilization rate                             |
| 🚫Flexible Overlap Control | Project-specific overlap cancellation option           | Handle special cases and emergency visits                   |

#### 3.  SEPE

Integration & Compliance Engine

Priority: Critical | POC Status: Validated requirement

| Feature               | Requirement                                     | Compliance Need                              |
| --------------------- | ----------------------------------------------- | -------------------------------------------- |
| 📊Auto Excel Export   | SEPE-formatted schedule exports                 | Meet Greek government reporting requirements |
| 🔄Real-time Sync      | Bi-directional data sync with Softone ERP       | Maintain single source of truth              |
| 📋Change Tracking     | Full audit trail for all schedule modifications | Regulatory compliance and accountability     |
| ⚠️Validation Engine | Pre-export validation against SEPE rules        | Prevent compliance violations                |

#### 4. Rate & Cost Management System

Priority: High | POC Status: Workflow validated

| Feature                | Requirement                                      | Business Logic                        |
| ---------------------- | ------------------------------------------------ | ------------------------------------- |
| 💵Dynamic Rate Setting | Partner rate modification with approval workflow | Balance flexibility with cost control |
| 🔒Rate Locking         | Post-approval rate protection                    | Prevent unauthorized changes          |
| 📊Cost Tracking        | Additional expenses with attachment support      | Comprehensive cost management         |
| 📝Audit Trail          | Complete rate change history                     | Financial transparency and control    |

### Phase II Advanced Features (Production Enhancement)

#### 5. Multi-Channel Experience

Priority: High | Future: Version 2 identified

| Channel                | Capability                              | Target Users                     |
| ---------------------- | --------------------------------------- | -------------------------------- |
| 🖥️Web Portal         | Full feature access                     | Account Coordinators, Audit Team |
| 📱Mobile App           | Schedule management, visit completion   | Partners (field workers)         |
| 💬AI Chat              | Natural language scheduling and changes | All users (UX enhancement)       |
| 📞Direct Communication | In-app messaging with GEP employees     | Partners ↔ Coordinators         |

#### 6. Visit Approval & Documentation System

Priority: High | POC Status: Process validated

| Feature                   | Requirement                                         | Current Process Integration                  |
| ------------------------- | --------------------------------------------------- | -------------------------------------------- |
| 📋Visit Status Management | Completed/Declined status with reasons              | Replace manual paper tracking                |
| 📎Document Upload         | Δελτία Επίσκεψης attachment handling | Support existing TEKMON/email/post workflows |
| 💰Cost Submission         | Per-visit rates + additional expenses               | Streamline current Excel-based process       |
| ✅Approval Workflow       | Internal Audit review and approval                  | Automate current manual review process       |

## System Architecture (Production-Grade)

### Integration Architecture

#### Core System Integrations

| System           | Integration Type   | Data Flow                     | Purpose                   |
| ---------------- | ------------------ | ----------------------------- | ------------------------- |
| 🏢Softone ERP    | Bi-directional API | Projects, Visits, Client Data | Single source of truth    |
| 🏛️SEPE.net     | Excel Export       | Schedule data                 | Government compliance     |
| 📱TEKMON Mobile  | API Integration    | Visit documentation           | Existing partner workflow |
| 💰Invoice System | Data Export        | Approved visit costs          | Financial processing      |

#### Data Synchronization Requirements

·
⚡ Real-time: Project
creation, assignment updates, critical changes

·
📊 Batch: Visit
approvals, SEPE exports, reporting data

·
🔄 Event-driven: Schedule
changes, status updates, notifications

### Security & Compliance Framework

#### Technical Security Features

| Feature                       | Requirement            | Implementation                            |
| ----------------------------- | ---------------------- | ----------------------------------------- |
| 🔐Multi-Factor Authentication | All user accounts      | SMS/Email/Authenticator app               |
| 👥Role-Based Access Control   | Granular permissions   | Partner/Coordinator/Audit roles           |
| 📋GDPR Compliance             | EU data protection     | Data encryption, consent management       |
| 📊Comprehensive Logging       | Full audit trails      | User actions, data changes, system events |
| 🔒Data Encryption             | At rest and in transit | AES-256, TLS 1.3                          |
