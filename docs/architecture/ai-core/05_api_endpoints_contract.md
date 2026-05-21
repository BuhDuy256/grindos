# Documentation: 05_api_endpoints_contract.md
# Project: GrindOS Core AI Engine (MVP Version)

## 1. Interaction Paradigm
The AI Core operates strictly as an independent RESTful Microservice. It does not directly interface with the end-user's Frontend client (Mobile/Web App). 
* The **Frontend Client** communicates solely with the primary **Web Backend (Gateway)**.
* The **Web Backend** orchestrates user authentication, rate-limiting, and state validation, then proxies or initiates server-to-server HTTP requests to the **AI Core** endpoints specified below.

---

## 2. API Endpoints Specification

### 2.1. Player Onboarding Campaign Generation
Invoked when a new user registers their overarching milestone objective for the first time.

* **Endpoint:** `POST /v1/onboarding/forge`
* **Description:** Receives the user's core long-term goal, triggers the AI Core to dynamically initialize Arc I configurations, and persists the payload into the `ai_contexts` table.
* **Inbound Payload (From Web BE):**
    ```json
    {
      "user_id": "string-uuid-12345",
      "username": "ZeroToHero",
      "timezone": "Asia/Ho_Chi_Minh",
      "main_goal": "Learn Golang Backend Development to secure a job within 6 months"
    }
    ```
* **Outbound Response (From AI Core):**
    ```json
    {
      "status": "success",
      "message": "Campaign forged successfully.",
      "active_arc": {
        "arc_id": 1,
        "arc_name": "Arc I: The Awakening Fog",
        "milestones": [
          { "week_number": 1, "objective": "Master core Golang syntax & architectural static database design" }
        ]
      }
    }
    ```

---

### 2.2. Fetch Daily Mission Log
Invoked by the Frontend client every morning to populate the user's primary interactive To-Do grid.

* **Endpoint:** `GET /v1/daily-plan`
* **Description:** Retrieves the structural missions and punitive terminal messages generated for the current day. Because the Thinking Module processes this during the 4:00 AM batch and writes it directly to the DB, this query resolves instantly ($<50\text{ms}$) with zero runtime LLM latency.
* **Query Parameters:** `?user_id=string-uuid-12345&date=2026-05-21`
* **Outbound Response:**
    ```json
    {
      "date": "2026-05-21",
      "system_message": "[SYSTEM TERMINAL INTERFACE]: You have slept too much. Wake up and grind, or embrace your destiny as a statistical failure.",
      "progress_analysis": "The user is demonstrating logical progression in algorithmic patterns, but structural physical vitality (VIT) is decaying.",
      "tasks": [
        {
          "id": "task-uuid-aaa",
          "parent_id": null,
          "title": "Starter: Initialize IDE and create main.go skeleton file",
          "duration_mins": 5,
          "is_completed": false,
          "origin_type": "SYSTEM_GENERATED"
        },
        {
          "id": "task-uuid-bbb",
          "parent_id": null,
          "title": "Deep Work: Implement secure CRUD REST API for user domain via Gin Framework",
          "duration_mins": 90,
          "is_completed": false,
          "origin_type": "SYSTEM_GENERATED"
        }
      ]
    }
    ```

---

### 2.3. End-of-Day Check-In Submissions
Invoked when the user triggers the "End Day" submission action on the Frontend interface.

* **Endpoint:** `POST /v1/daily-plan/end-day`
* **Description:** Receives the execution log, completed task arrays, and the user's qualitative reflection note. This endpoint writes the data immediately into the `daily_plans` table and responds with an HTTP 202 Accepted status. It does NOT invoke any LLM routines during the request window to maintain optimal user experience; data digestion is deferred to the midnight **Learning** batch.
* **Inbound Payload:**
    ```json
    {
      "user_id": "string-uuid-12345",
      "date": "2026-05-21",
      "user_note": "Completed CRUD operations successfully, but lost 30 minutes scrolling through feeds due to fatigue.",
      "completed_task_ids": ["task-uuid-aaa", "task-uuid-bbb"]
    }
    ```
* **Outbound Response:**
    ```json
    {
      "status": "accepted",
      "message": "Logs recorded. The System will evaluate your performance at midnight."
    }
    ```

---

### 2.4. Character Profile RPG Stats
Populates the user's character profile sheet, level badge, and stat dashboard attributes.

* **Endpoint:** `GET /v1/player/profile`
* **Description:** Extracts active tracked RPG values (`STR`, `INT`, `VIT`, `Streak`, `Multiplier`) mapped to the targeted tenant.
* **Query Parameters:** `?user_id=string-uuid-12345`
* **Outbound Response:**
    ```json
    {
      "user_id": "string-uuid-12345",
      "stats": {
        "level": 3,
        "exp": 450,
        "str_stat": 12,
        "int_stat": 15,
        "vit_stat": 9,
        "streak": 4,
        "difficulty_multiplier": 1.10
      }
    }
    ```

---

### 2.5. Retrieve Campaign Bridge Choice Options (Day 30 Exclusive)
Populates the interactive choice menu interface when a user finishes a 4-week narrative arc block.

* **Endpoint:** `GET /v1/campaign/bridge-options`
* **Description:** Fetches alternative dynamic storyline routes created by the AI bridge algorithm reflecting the metrics of the preceding 30 days. This endpoint only yields data arrays if the `Arc Day Index == 30`.
* **Query Parameters:** `?user_id=string-uuid-12345`
* **Outbound Response:**
    ```json
    {
      "current_arc_id": 1,
      "summary_assessment": "You have conquered 85% of core Golang baseline execution paths, but your transactional database query layer remains critically unstable.",
      "choices": [
        {
          "choice_id": "CHOICE_A",
          "title": "Path of SQL Mastery (Hardcore Mode)",
          "description": "Unlock Arc II focused completely on query performance optimization and dense indexing. Drastically increases INT; extreme risk of Penalty events."
        },
        {
          "choice_id": "CHOICE_B",
          "title": "Path of Full-Stack Architecture (Balanced Mode)",
          "description": "Unlock Arc II focused on immediate real-world deployment pipelines. Steady allocation balancing STR and INT parameters."
        }
      ]
    }
    ```

---

### 2.6. Commit Selected Campaign Bridge Choice
Executes and locks the chosen narrative option to instantiate the next operational map tier.

* **Endpoint:** `POST /v1/campaign/select-bridge`
* **Inbound Payload:**
    ```json
    {
      "user_id": "string-uuid-12345",
      "selected_choice_id": "CHOICE_A"
    }
    ```
* **Outbound Response:**
    ```json
    {
      "status": "success",
      "message": "Arc II Activated: Path of SQL Mastery initialized."
    }
    ```