# Architecture rules
- Keep Pomodoro state in a single app-level provider and use wall-clock deadlines, so navigation and background throttling do not reset the timer.
- Store teacher website drafts separately from published snapshots and render authored HTML in an opaque-origin sandbox, so public readers never receive private drafts or application credentials.