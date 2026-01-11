# Session Handoff Summary

Generate a comprehensive handoff document for transitioning to a new Claude Code session. This summary should capture all context needed for seamless continuation of work.

## Instructions

Analyze the current session and create a structured handoff summary by:

1. **Review the conversation history** to identify:
   - The original task/request from the user
   - All decisions made during implementation
   - Technical approaches chosen and why
   - Any alternatives that were considered and rejected

2. **Examine recent changes** by running:
   - `git status` to see uncommitted changes
   - `git diff --stat` to understand scope of modifications
   - `git log --oneline -10` to see recent commits from this session

3. **Identify blockers and issues**:
   - Errors or failures encountered
   - Unresolved questions that need user input
   - Technical limitations discovered
   - Dependencies or prerequisites missing

4. **Document remaining work**:
   - Tasks started but not completed
   - Known TODOs mentioned in conversation
   - Follow-up items identified during implementation

## Output Format

Write the handoff summary to `HANDOFF.md` in the project root with this structure:

```markdown
# Session Handoff - [DATE]

## Original Request
[What the user asked for]

## Decisions Made
- [Decision 1]: [Rationale]
- [Decision 2]: [Rationale]

## Changes Completed
- [File/feature 1]: [What was done]
- [File/feature 2]: [What was done]

### Git Status
[Output of git status if there are uncommitted changes]

### Recent Commits (This Session)
[Relevant commits from this session]

## Blockers & Issues
- [Blocker 1]: [Details and potential solutions]
- [Issue 1]: [Details]

## Remaining Work
- [ ] [Task 1]
- [ ] [Task 2]

## Key Files to Review
- `path/to/file1.ts` - [Why it's relevant]
- `path/to/file2.ts` - [Why it's relevant]

## Context for Next Session
[Any additional context, gotchas, or important notes the next session should know]
```

## Important

- Be specific and detailed - the next session has no memory of this one
- Include file paths with line numbers where relevant
- Quote any important error messages verbatim
- Note any user preferences or constraints discovered during the session
- If there's a todo list active, include its current state
