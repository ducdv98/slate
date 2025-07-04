erDiagram
USER ||--o{ MEMBERSHIP : "has"
USER ||--o{ ISSUE : "assigned_to"
USER ||--o{ COMMENT : "created"
USER ||--o{ ACTIVITY : "performed"
USER ||--o{ NOTIFICATION : "receives"
USER ||--o{ NOTIFICATION_CHANNEL : "configures"
USER ||--o{ DEVICE_SESSION : "uses"
WORKSPACE ||--o{ MEMBERSHIP : "contains"
WORKSPACE ||--o{ PROJECT : "contains"
WORKSPACE ||--o{ CYCLE : "contains"
WORKSPACE ||--o{ LABEL : "contains"
WORKSPACE ||--o{ AUTOMATION : "contains"
WORKSPACE ||--o{ INTEGRATION : "contains"
WORKSPACE ||--o{ CUSTOM_VIEW : "contains"
WORKSPACE ||--o{ SUBSCRIPTION : "has"
WORKSPACE ||--o{ GIT_REPOSITORY : "contains"
WORKSPACE ||--o{ ROADMAP : "contains"
WORKSPACE ||--o{ METRIC : "tracks"
WORKSPACE ||--o{ DATA_EXPORT : "generates"
WORKSPACE ||--o{ DATA_IMPORT : "initiates"
WORKSPACE ||--o{ AUDIT_LOG : "records"
WORKSPACE ||--o{ SSO_CONFIG : "configures"
PROJECT ||--o{ ISSUE : "contains"
PROJECT ||--o{ MILESTONE : "contains"
PROJECT ||--o{ ROADMAP_ITEM : "included_in"
ISSUE ||--o{ COMMENT : "has"
ISSUE ||--o{ ATTACHMENT : "has"
ISSUE ||--o{ ISSUE_LABEL : "labeled"
ISSUE ||--o{ DEPENDENCY : "blocks"
ISSUE ||--o{ GIT_COMMIT : "linked_to"
ISSUE ||--o{ PULL_REQUEST : "linked_to"
CYCLE ||--o{ ISSUE : "contains"
CYCLE ||--o{ TEAM_PERFORMANCE : "measures"
LABEL ||--o{ ISSUE_LABEL : "applied_to"
AUTOMATION ||--o{ AUTOMATION_ACTION : "triggers"
GIT_REPOSITORY ||--o{ GIT_COMMIT : "contains"
GIT_REPOSITORY ||--o{ PULL_REQUEST : "contains"
ROADMAP ||--o{ ROADMAP_ITEM : "contains"
USER ||--o{ OFFLINE_SYNC : "uses"
USER ||--o{ SEARCH_INDEX : "queries"

    USER {
        string id PK
        string name
        string email
        string password_hash
        string avatar_url
        json keyboard_shortcuts
        json notification_preferences
        string timezone
        datetime created_at
        datetime last_login
        boolean email_verified
    }

    WORKSPACE {
        string id PK
        string name
        string description
        datetime created_at
        string billing_tier
    }

    MEMBERSHIP {
        string id PK
        string user_id FK
        string workspace_id FK
        string role "ENUM(admin, member, guest)"
        string status "ENUM(active, pending, suspended)"
        string invited_by FK
        datetime invited_at
        datetime joined_at
        json permissions_override
    }

    PROJECT {
        string id PK
        string workspace_id FK
        string name
        string description
        date start_date
        date target_date
        float progress
        json custom_fields
    }

    ISSUE {
        string id PK
        string project_id FK
        string assignee_id FK
        string cycle_id FK
        string parent_issue_id FK
        string title
        text description
        string priority "ENUM(urgent, high, medium, low)"
        string status "ENUM(todo, in_progress, done)"
        integer estimate
        integer story_points
        date due_date
        datetime created_at
        datetime updated_at
        string created_by FK
        json metadata
    }

    COMMENT {
        string id PK
        string issue_id FK
        string user_id FK
        text content
        datetime created_at
        json reactions
    }

    ATTACHMENT {
        string id PK
        string issue_id FK
        string file_name
        string file_url
        integer file_size
        datetime uploaded_at
        string uploaded_by FK
    }

    LABEL {
        string id PK
        string workspace_id FK
        string name
        string color
    }

    ISSUE_LABEL {
        string issue_id PK, FK
        string label_id PK, FK
    }

    DEPENDENCY {
        string blocking_issue_id PK, FK
        string blocked_issue_id PK, FK
        string dependency_type "ENUM(blocks, relates)"
    }

    CYCLE {
        string id PK
        string workspace_id FK
        string name
        date start_date
        date end_date
        string goal
        float progress
        boolean active
    }

    MILESTONE {
        string id PK
        string project_id FK
        string title
        date target_date
        boolean completed
        datetime completed_at
    }

    AUTOMATION {
        string id PK
        string workspace_id FK
        string name
        json trigger_conditions
        json actions
        boolean enabled
        string created_by FK
        integer execution_count
        datetime last_executed
    }

    AUTOMATION_ACTION {
        string id PK
        string automation_id FK
        string action_type "ENUM(move_status, notify, create_task)"
        json action_parameters
    }

    INTEGRATION {
        string id PK
        string workspace_id FK
        string type "ENUM(github, gitlab, slack, figma)"
        json configuration
        boolean enabled
    }

    CUSTOM_VIEW {
        string id PK
        string workspace_id FK
        string created_by FK
        string name
        json filters
        json column_config
        boolean shared
    }

    ACTIVITY {
        string id PK
        string user_id FK
        string workspace_id FK
        string action_type "ENUM(create, update, delete, comment)"
        string target_id
        string target_type
        json changes
        datetime created_at
    }

    SUBSCRIPTION {
        string id PK
        string workspace_id FK
        string tier "ENUM(free, team, enterprise)"
        date start_date
        date end_date
        integer storage_limit
        integer user_limit
        integer automation_limit
    }

    GIT_REPOSITORY {
        string id PK
        string workspace_id FK
        string integration_id FK
        string provider "ENUM(github, gitlab, bitbucket)"
        string repo_url
        string access_token_encrypted
        datetime connected_at
    }

    GIT_COMMIT {
        string id PK
        string repository_id FK
        string commit_hash
        string message
        string author
        datetime committed_at
    }

    ISSUE_COMMIT {
        string issue_id PK, FK
        string commit_id PK, FK
        string link_type "ENUM(fixes, references, closes)"
    }

    PULL_REQUEST {
        string id PK
        string repository_id FK
        string issue_id FK
        string pr_number
        string title
        string status "ENUM(open, merged, closed)"
        string url
        datetime created_at
    }

    NOTIFICATION {
        string id PK
        string user_id FK
        string workspace_id FK
        string type "ENUM(mention, assignment, status_change)"
        string target_id
        string target_type
        text message
        boolean read
        datetime created_at
    }

    NOTIFICATION_CHANNEL {
        string id PK
        string user_id FK
        string type "ENUM(email, slack, in_app)"
        json configuration
        boolean enabled
    }

    ROADMAP {
        string id PK
        string workspace_id FK
        string name
        date start_date
        date end_date
        json visualization_config
        string created_by FK
    }

    ROADMAP_ITEM {
        string id PK
        string roadmap_id FK
        string project_id FK
        string milestone_id FK
        integer display_order
        string color
    }

    METRIC {
        string id PK
        string workspace_id FK
        string type "ENUM(velocity, burndown, cycle_time)"
        json data
        date period_start
        date period_end
        datetime calculated_at
    }

    TEAM_PERFORMANCE {
        string id PK
        string workspace_id FK
        string cycle_id FK
        integer issues_completed
        integer story_points_completed
        float velocity
        float cycle_time_avg
    }

    DATA_EXPORT {
        string id PK
        string workspace_id FK
        string user_id FK
        string format "ENUM(csv, json)"
        string status "ENUM(pending, processing, completed, failed)"
        string file_url
        datetime requested_at
        datetime completed_at
    }

    DATA_IMPORT {
        string id PK
        string workspace_id FK
        string source "ENUM(jira, trello, asana)"
        string status "ENUM(pending, processing, completed, failed)"
        json mapping_config
        text error_log
        datetime started_at
        datetime completed_at
    }

    SEARCH_INDEX {
        string id PK
        string workspace_id FK
        string entity_type "ENUM(issue, project, comment)"
        string entity_id
        text searchable_content
        datetime indexed_at
    }

    OFFLINE_SYNC {
        string id PK
        string user_id FK
        string device_id
        json cached_data
        datetime last_sync
        json pending_changes
    }

    DEVICE_SESSION {
        string id PK
        string user_id FK
        string device_type "ENUM(ios, android, web)"
        string device_token
        datetime last_active
    }

    AUDIT_LOG {
        string id PK
        string workspace_id FK
        string user_id FK
        string action
        string target_type
        string target_id
        json changes
        string ip_address
        datetime created_at
    }

    SSO_CONFIG {
        string id PK
        string workspace_id FK
        string provider "ENUM(google, okta, azure)"
        json configuration
        boolean enabled
    }
