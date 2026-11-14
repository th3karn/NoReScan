# Agent Operational Workflow

```
[ New Agent Turn ]
        │
        ▼
[ Query get_task_context(task) ]
        │
        ▼
[ Review Returned Files & Dependencies ]
        │
        ├─────────────────────────────┐
        ▼                             ▼
[ File is Unchanged (Valid) ]   [ File is Stale / Modified ]
  - Reuse AST summary             - Read current source from disk
  - Trust exported symbols        - Refresh understanding
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
         [ Implement Requested Changes ]
                       │
                       ▼
       [ Run Tests & Verification Commands ]
                       │
                       ▼
         [ Call record_decision & scan ]
```

