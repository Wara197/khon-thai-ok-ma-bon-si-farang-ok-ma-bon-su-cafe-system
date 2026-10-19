# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Cashiers use the point-of-sale screen to take and complete customer orders during service.
- Baristas use the preparation screen to review incoming orders and update drink status.
- The shop owner uses the back-office dashboard to review sales and shop operations.

## Product Purpose

Coffee Shop POS supports the shop's order workflow from cashier entry through barista preparation and owner oversight. It is intended to reduce mistakes associated with handwritten orders, speed up handoff to the barista, and make shop activity easier to monitor. Success means staff can complete these tasks quickly and reliably while serving customers.

## Positioning

Project requirements describe one connected workflow: the cashier records a structured order and payment, the barista receives its preparation details in a queue, and the owner reviews shop information. The repository frames this as a digital alternative to handwritten order taking. No exclusive competitive claim has been established.

## Operating Context

- Cashier and barista screens are primarily used on tablets or large touch displays in the shop.
- The owner's dashboard is primarily used on a computer.
- The interface should support quick use during customer service and be usable in Chrome on tablet and desktop screens; project requirements specify widths of at least 768 px.
- The repository describes three branches as a project requirement. Confirm the active deployment configuration before treating that as a live operating fact.

## Capabilities and Constraints

- Project requirements cover menu browsing and management; drink size, sweetness, and topping choices; price calculation; cash, transfer, and QR payment recording; order and queue identifiers; barista queue and status progression; inventory tracking and low-stock alerts; and sales reporting.
- Existing frontend code is a React 19 and Vite single-page app. The backend is Node.js with Express and a REST API.
- The current runtime opens a SQLite file through `sqlite3` in `backend/db.js`. `mysql2` remains a package dependency, but the inspected runtime path does not switch to MySQL; older documents that describe MySQL are historical or stale unless explicitly marked otherwise.
- The requirements document excludes full accounting, delivery, and payroll systems from scope.
- Treat capability status in course documents as documented project intent or reported review results; verify current code before claiming a feature is production-ready.

## Brand Commitments

- The user describes the shop as a modern, premium cafe brand: clean, trustworthy, and approachable.
- Avoid a generic off-the-shelf UI appearance.
- No official shop name, logo, or other fixed brand asset has been confirmed.

## Evidence on Hand

- Product and system requirements: `project/docs/wk03-requirements.md`, `project/docs/wk04-user-stories.md`, and `project/docs/wk10-srs.md`.
- Course artifacts include wireframes, test cases, a usability report, a quality review, and project reports under `project/docs/`.
- The usability and quality documents report evaluation results, including SUS and timing figures. These are course-document claims and have not been independently revalidated here.
- Existing application code is under `project/frontend/` and `project/backend/`; menu image assets are under `project/frontend/public/images/` and upload directories.
- No verified customer testimonials, press, or external market evidence are documented.

## Product Principles

1. Let staff complete common counter tasks quickly during service.
2. Preserve order choices and payment details through the handoff to preparation.
3. Give the owner useful operational and sales information without obscuring the underlying facts.
4. Keep product claims consistent with current code and documented evidence.

## Accessibility & Inclusion

Cashier and barista controls must be comfortable to operate by touch: targets should fit a finger and remain clearly separated. No formal accessibility standard or additional user-specific accommodation has been established.
