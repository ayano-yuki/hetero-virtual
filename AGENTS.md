## General Settings

- Respond in Japanese.
- Before making changes, review the existing implementation and README.
- Prefer the existing naming, structure, and libraries.
- Do not perform refactoring unrelated to the request.
- Treat existing uncommitted changes as the user's work, and do not revert them without permission.
- Before implementing changes that involve code modifications, create a plan, share it, and proceed only after approval.
  - If the plan needs to change after approval, ask for permission each time.
- If any file changes are made, update `LOG.md` at the end and ask for permission to create a Git commit.
  - Structure `LOG.md` as follows:
    - Summarize the implementation in one sentence and use it as the section title.
    - Include implementation details and changed files in the section.

## Git Operations

- Review the diff before committing.
- Keep each commit small enough to be easy to review.
- Use commit messages with enough detail to clearly describe the changes.
- Add an appropriate prefix to each commit message.