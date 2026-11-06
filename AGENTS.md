# Architecture rules
- Keep Pomodoro state in a single app-level provider and use wall-clock deadlines, so navigation and background throttling do not reset the timer.
- Store teacher website drafts separately from published snapshots and render authored HTML in an opaque-origin sandbox, so public readers never receive private drafts or application credentials.
- Store versioned visual-site pages and theme settings in the draft's existing JSON field, and compile all pages into one hash-navigated published snapshot, so legacy single-page drafts stay editable and no private draft is needed for navigation.- Grant parents read access only through `parent_links` rows created by the `redeem_parent_code` function, never from `profiles.role`, because the role field is user-editable.
- Grant principal rights only through `school_principals` (set at sign-up or by service role) and add school members only via the `add_school_member` function, because `profiles.role` is user-editable.
